-- 1. Clear existing embeddings
UPDATE supermarket_offers SET embedding = NULL;

-- 2. Drop existing index
DROP INDEX IF EXISTS supermarket_offers_embedding_idx;

-- 3. Change column type
ALTER TABLE supermarket_offers 
ALTER COLUMN embedding TYPE vector(384);

-- 4. Recreate the index
CREATE INDEX supermarket_offers_embedding_idx ON supermarket_offers 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5. Drop existing function versions
DROP FUNCTION IF EXISTS hybrid_search(text, vector(512), int, float, float);
DROP FUNCTION IF EXISTS hybrid_search(text, vector(384), int, float, float);

-- 6. Create new function
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 5,
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
      to_tsvector('dutch', COALESCE(s.product_name, '') || ' ' || COALESCE(s.description, '') || ' ' || COALESCE(s.category, '')) @@ plainto_tsquery('dutch', query_text)
      OR 1 - (s.embedding <=> query_embedding) > 0.3
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$; 