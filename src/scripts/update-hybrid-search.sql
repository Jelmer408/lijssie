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
  WITH text_matches AS (
    SELECT
      s.*,
      ts_rank(
        setweight(to_tsvector('dutch', COALESCE(s.product_name, '')), 'A') ||
        setweight(to_tsvector('dutch', COALESCE(s.description, '')), 'B') ||
        setweight(to_tsvector('dutch', COALESCE(s.category, '')), 'C'),
        plainto_tsquery('dutch', query_text)
      ) as text_rank,
      (1 - (s.embedding <=> query_embedding)) as semantic_similarity
    FROM supermarket_offers s
    WHERE s.valid_until >= current_date
  )
  SELECT
    t.id,
    t.supermarket,
    t.product_name,
    t.description,
    t.original_price,
    t.offer_price,
    t.discount_percentage,
    t.quantity,
    t.unit,
    t.category,
    t.valid_from,
    t.valid_until,
    t.image_url,
    t.created_at,
    t.updated_at,
    t.sale_type,
    t.embedding,
    (full_text_weight * t.text_rank + semantic_weight * t.semantic_similarity)::float as similarity
  FROM text_matches t
  WHERE
    -- Require a minimum text match in product name OR a strong semantic match
    (t.text_rank > 0.1 AND t.semantic_similarity > 0.6) OR
    (t.text_rank > 0.3) OR
    (t.semantic_similarity > 0.8)
  ORDER BY
    -- Prioritize exact matches in product name
    (to_tsvector('dutch', t.product_name) @@ plainto_tsquery('dutch', query_text)) DESC,
    similarity DESC
  LIMIT
    -- Only return results if they meet our threshold
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM text_matches 
        WHERE (text_rank > 0.1 AND semantic_similarity > 0.6) OR
              (text_rank > 0.3) OR
              (semantic_similarity > 0.8)
        LIMIT 1
      )
      THEN match_count
      ELSE 0
    END;
END;
$$;