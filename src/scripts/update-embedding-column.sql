-- First, check if we need to drop the existing index
DROP INDEX IF EXISTS supermarket_offers_embedding_idx;

-- Alter the column type to vector(384)
ALTER TABLE supermarket_offers 
ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384);

-- Recreate the index
CREATE INDEX supermarket_offers_embedding_idx ON supermarket_offers 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); 