  -- Drop all versions of the function
  DROP FUNCTION IF EXISTS hybrid_search(text, vector(512), int, float, float);
  DROP FUNCTION IF EXISTS hybrid_search(text, vector(384), int, float, float);

  -- Create a function to expand Dutch synonyms
  CREATE OR REPLACE FUNCTION expand_dutch_synonyms(input_text text)
  RETURNS text AS $$
  DECLARE
    expanded text;
  BEGIN
    expanded := input_text;
    
    -- Common Dutch product synonyms
    expanded := CASE
      WHEN input_text ILIKE '%wc%papier%' THEN 'wc papier toilet papier toiletpapier'
      WHEN input_text ILIKE '%toilet%papier%' THEN 'wc papier toilet papier toiletpapier'
      WHEN input_text ILIKE '%wasmiddel%' THEN 'wasmiddel waspoeder wasgel'
      WHEN input_text ILIKE '%waspoeder%' THEN 'wasmiddel waspoeder wasegel'
      WHEN input_text ILIKE '%afwas%' THEN 'afwasmiddel vaatwas afwas'
      WHEN input_text ILIKE '%vaatwas%' THEN 'afwasmiddel vaatwas afwas'
      WHEN input_text ILIKE '%zeep%' THEN 'zeep handzeep douchegel'
      WHEN input_text ILIKE '%chips%' THEN 'chips crisps'
      WHEN input_text ILIKE '%frisdrank%' THEN 'frisdrank cola sinas fanta limonade'
      WHEN input_text ILIKE '%groente%' THEN 'groente groenten'
      WHEN input_text ILIKE '%aardappel%' THEN 'aardappel aardappelen pieper'
      ELSE input_text
    END;
    
    RETURN expanded;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;

  -- Create the hybrid search function
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
  DECLARE
    expanded_query text;
    min_similarity float := 0.15; -- Minimum similarity threshold
  BEGIN
    -- Expand the query with synonyms
    expanded_query := expand_dutch_synonyms(query_text);

    RETURN QUERY
    WITH text_matches AS (
      SELECT
        s.*,
        -- Prioritize exact product name matches, including expanded synonyms
        CASE 
          WHEN LOWER(s.product_name) LIKE '%' || LOWER(query_text) || '%' THEN 1.0
          WHEN EXISTS (
            SELECT 1 
            FROM unnest(string_to_array(LOWER(expanded_query), ' ')) word
            WHERE LOWER(s.product_name) LIKE '%' || word || '%'
          ) THEN 0.9
          WHEN to_tsvector('dutch', s.product_name) @@ to_tsquery('dutch', regexp_replace(expanded_query, '\s+', ' & ', 'g')) THEN 0.8
          ELSE 0.0
        END as exact_match_score,
        -- Text ranking with higher weight on product name and expanded synonyms
        (
          ts_rank(
            setweight(to_tsvector('dutch', COALESCE(s.product_name, '')), 'A') ||
            setweight(to_tsvector('dutch', COALESCE(s.description, '')), 'D') ||
            setweight(to_tsvector('dutch', COALESCE(s.category, '')), 'D'),
            to_tsquery('dutch', regexp_replace(expanded_query, '\s+', ' & ', 'g'))
          ) +
          ts_rank(
            setweight(to_tsvector('dutch', COALESCE(s.product_name, '')), 'A'),
            plainto_tsquery('dutch', query_text)
          )
        ) / 2 as text_rank,
        -- Semantic similarity for finding variations/brands
        (1 - (s.embedding <=> query_embedding)) as semantic_similarity
      FROM supermarket_offers s
      WHERE s.valid_until >= current_date
        -- Pre-filter to reduce irrelevant matches
        AND (
          EXISTS (
            SELECT 1 
            FROM unnest(string_to_array(LOWER(expanded_query), ' ')) word
            WHERE LOWER(s.product_name) LIKE '%' || word || '%'
          )
          OR to_tsvector('dutch', s.product_name || ' ' || COALESCE(s.description, '')) @@ to_tsquery('dutch', regexp_replace(expanded_query, '\s+', ' & ', 'g'))
          OR (1 - (s.embedding <=> query_embedding)) > 0.8
        )
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
      (
        -- Heavily weight exact matches
        (t.exact_match_score * 2.5) +
        -- Give good weight to text matches
        (full_text_weight * t.text_rank * 1.5) +
        -- Lower weight on semantic matches
        (semantic_weight * t.semantic_similarity * 0.3)
      )::float as similarity
    FROM text_matches t
    WHERE
      -- Stricter requirements for matches
      (
        t.exact_match_score > 0 OR
        (t.text_rank > 0.3) OR
        (t.semantic_similarity > 0.8 AND t.text_rank > 0.15)
      )
      -- Ensure overall similarity meets minimum threshold
      AND (
        (t.exact_match_score * 2.5 +
         full_text_weight * t.text_rank * 1.5 +
         semantic_weight * t.semantic_similarity * 0.3) > min_similarity
      )
    ORDER BY
      -- Prioritize exact matches first, then combined score
      t.exact_match_score DESC,
      similarity DESC
    LIMIT 
      -- Only return results if we have good matches
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM text_matches 
          WHERE exact_match_score > 0 
             OR text_rank > 0.3 
             OR (semantic_similarity > 0.8 AND text_rank > 0.15)
          LIMIT 1
        ) THEN match_count
        ELSE 0
      END;
  END;
  $$;