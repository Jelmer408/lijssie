-- Drop all versions of the function
DROP FUNCTION IF EXISTS hybrid_search(text, vector(512), int, float, float);
DROP FUNCTION IF EXISTS hybrid_search(text, vector(384), int, float, float);

-- Create the new function with 384 dimensions
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 20,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0
) RETURNS TABLE (
  id uuid,
  supermarket supermarket_name,
  product_name text,
  description text,
  original_price text,
  offer_price text,
  discount_percentage integer,
  quantity text,
  unit text,
  category text,
  valid_from date,
  valid_until date,
  image_url text,
  created_at timestamptz,
  updated_at timestamptz,
  sale_type text,
  embedding vector(384),
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.supermarket,
    s.product_name,
    s.description,
    s.original_price,
    s.offer_price,
    s.discount_percentage,
    s.quantity,
    s.unit,
    s.category,
    s.valid_from,
    s.valid_until,
    s.image_url,
    s.created_at,
    s.updated_at,
    s.sale_type,
    s.embedding,
    (full_text_weight * ts_rank(to_tsvector('dutch', COALESCE(s.product_name, '') || ' ' || COALESCE(s.description, '') || ' ' || COALESCE(s.category, '')), plainto_tsquery('dutch', query_text)) +
     semantic_weight * (1 - (s.embedding <=> query_embedding)))::float as similarity
  FROM supermarket_offers s
  WHERE s.valid_until >= current_date
    AND (
      -- Require either a good text match or semantic match
      (to_tsvector('dutch', COALESCE(s.product_name, '') || ' ' || COALESCE(s.description, '') || ' ' || COALESCE(s.category, '')) @@ plainto_tsquery('dutch', query_text))
      OR (1 - (s.embedding <=> query_embedding) > 0.5)  -- Increased threshold for better relevance
    )
    AND (
      -- Ensure overall similarity score is good enough
      (full_text_weight * ts_rank(to_tsvector('dutch', COALESCE(s.product_name, '') || ' ' || COALESCE(s.description, '') || ' ' || COALESCE(s.category, '')), plainto_tsquery('dutch', query_text)) +
       semantic_weight * (1 - (s.embedding <=> query_embedding)))::float > 0.4  -- Added minimum overall similarity threshold
    )
  ORDER BY similarity DESC
  LIMIT LEAST(match_count, 20);  -- Cap at 20 but allow fewer
END;
$$;