-- Enable the pgvector extension
create extension if not exists vector;

-- Create the hybrid search function
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(512),
  match_count int default 5,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0
) returns table (
  id uuid,
  name text,
  supermarket text,
  current_price numeric,
  original_price numeric,
  sale_type text,
  valid_until timestamptz,
  image_url text,
  similarity float
)
language plpgsql
as 13193
begin
  return query
  select
    s.id,
    s.name,
    s.supermarket,
    s.current_price,
    s.original_price,
    s.sale_type,
    s.valid_until,
    s.image_url,
    (full_text_weight * ts_rank(to_tsvector('english', s.name), plainto_tsquery('english', query_text)) +
     semantic_weight * (1 - (s.embedding <=> query_embedding))) as similarity
  from supermarket_offers s
  where s.valid_until > now()
  order by similarity desc
  limit match_count;
end;
13193;
