  -- Drop all versions of the function
  DROP FUNCTION IF EXISTS hybrid_search(text, vector(512), int, float, float);
  DROP FUNCTION IF EXISTS hybrid_search(text, vector(384), int, float, float);

  -- Drop existing function
  DROP FUNCTION IF EXISTS expand_dutch_synonyms(text);

  -- Create a more comprehensive Dutch synonyms function
  CREATE OR REPLACE FUNCTION expand_dutch_synonyms(input_text text)
  RETURNS text AS $$
  DECLARE
    expanded text;
  BEGIN
    expanded := input_text;
    
    -- Common Dutch product synonyms with their variations
    expanded := CASE
      -- Toilet Paper & Cleaning
      WHEN input_text ILIKE ANY(ARRAY['%wc%papier%', '%wc%rol%', '%wcpapier%', '%wc rol%', '%toilet%papier%']) 
        THEN 'wc papier toilet papier toiletpapier wc rol wcpapier closetpapier wcrollen toiletrollen page edet lotus neutral tempo zewa'
      WHEN input_text ILIKE ANY(ARRAY['%wasmiddel%', '%waspoeder%', '%wasgel%', '%wasverzachter%']) 
        THEN 'wasmiddel waspoeder wasgel wasbol wasverzachter vloeibaar wasmiddel ariel persil omo robijn sunil lenor neutral biotex dreft ajax wasmiddelen wasproduct'
      WHEN input_text ILIKE ANY(ARRAY['%vaatwas%', '%afwas%']) 
        THEN 'afwasmiddel vaatwastabletten vaatwas tabletten vaatwasblokjes vaatwasgel dreft sun finish ajax ecover vaatwasreiniger vaatwascapsules afwasproduct'
      
      -- Personal Care
      WHEN input_text ILIKE ANY(ARRAY['%zeep%', '%handzeep%', '%douchegel%', '%shampoo%']) 
        THEN 'zeep handzeep douchegel doucheschuim handgel handsoap dove sanex nivea palmolive dettol rituals axe neutral zwitsal radox shampoo conditioner'
      WHEN input_text ILIKE ANY(ARRAY['%tandpasta%', '%tandenborstel%']) 
        THEN 'tandpasta tandenborstel mondwater oral-b colgate sensodyne parodontax elmex prodent aquafresh'
      
      -- Snacks & Chips
      WHEN input_text ILIKE ANY(ARRAY['%chips%', '%crisp%', '%nachos%']) 
        THEN 'chips crisps aardappelchips nachochips tortillachips lays pringles doritos bugles croky smiths tyrells jumbo chips ah chips lidl chips duyvis'
      WHEN input_text ILIKE ANY(ARRAY['%noten%', '%pinda%', '%cashew%']) 
        THEN 'noten pinda pindas cashew cashewnoten walnoten amandelen hazelnoten pistache pecannoten macadamia duyvis felix chio'
      
      -- Beverages
      WHEN input_text ILIKE ANY(ARRAY['%frisdrank%', '%cola%', '%sinas%', '%fanta%', '%prik%', '%energy%']) 
        THEN 'frisdrank cola sinas fanta limonade prik sprite coca cola pepsi fernandes red bull monster river lipton fuze tea 7up seven up mountain dew dr pepper royal club energy energiedrank'
      WHEN input_text ILIKE ANY(ARRAY['%bier%', '%pils%', '%heineken%', '%grolsch%', '%hertog%']) 
        THEN 'bier pils speciaalbier heineken grolsch hertog jan amstel bavaria jupiler corona leffe hoegaarden brand alfa warsteiner desperados palm duvel la chouffe weizen ipa alcoholvrij bier 0.0 radler'
      WHEN input_text ILIKE ANY(ARRAY['%wijn%', '%cava%', '%prosecco%']) 
        THEN 'wijn rode wijn witte wijn rose rosé cava prosecco champagne chardonnay merlot cabernet sauvignon pinot grigio sauvignon blanc'
      
      -- Dairy & Eggs
      WHEN input_text ILIKE ANY(ARRAY['%melk%', '%karnemelk%', '%yoghurt%']) 
        THEN 'melk halfvolle melk volle melk magere melk karnemelk lactosevrije melk sojamelk amandelmelk havermelk campina arla alpro oatly optimel friesche vlag milsani yoghurt kwark'
      WHEN input_text ILIKE ANY(ARRAY['%kaas%', '%48+%', '%belegen%']) 
        THEN 'kaas jong belegen oude kaas geitenkaas old amsterdam beemster milner leerdammer maaslander vergeer president boerenkaas 48+ 30+'
      WHEN input_text ILIKE ANY(ARRAY['%eieren%', '%ei%']) 
        THEN 'eieren scharrel scharreleieren vrije uitloop biologische eieren kipei eieren xl eieren m'
      
      -- Bread & Bakery
      WHEN input_text ILIKE ANY(ARRAY['%brood%', '%boterham%']) 
        THEN 'brood boterham boterhammen pistolet stokbrood afbakbrood tijgerbrood volkorenbrood witbrood bruinbrood waldkorn zonnebloem speltbrood'
      WHEN input_text ILIKE ANY(ARRAY['%koek%', '%cake%', '%gebak%']) 
        THEN 'koek cake gebak taart koekjes speculaas stroopwafel ontbijtkoek gevulde koek appeltaart appelgebak'
      
      -- Coffee & Tea
      WHEN input_text ILIKE ANY(ARRAY['%koffie%', '%senseo%', '%nespresso%']) 
        THEN 'koffie koffiebonen gemalen koffie koffiepads koffiecups capsules oploskoffie douwe egberts nespresso senseo lavazza illy nescafe starbucks peeze jacobs dolce gusto'
      WHEN input_text ILIKE ANY(ARRAY['%thee%', '%tea%']) 
        THEN 'thee theezakjes groene thee zwarte thee rooibos kruidenthee pickwick lipton twinings zonnatura pukka celestial yogi tea teekanne'
      
      -- Meat & Fish
      WHEN input_text ILIKE ANY(ARRAY['%vlees%', '%gehakt%', '%worst%']) 
        THEN 'vlees gehakt rundergehakt half om half gehakt kipfilet rundvlees varkensvlees worst braadworst rookworst'
      WHEN input_text ILIKE ANY(ARRAY['%vis%', '%zalm%', '%tonijn%']) 
        THEN 'vis zalm tonijn kabeljauw tilapia pangasius makreel haring gerookte zalm verse vis diepvries vis'
      
      -- Vegetables & Fruit
      WHEN input_text ILIKE ANY(ARRAY['%groente%', '%groenten%']) 
        THEN 'groente groenten verse groenten verse groente groentemix groentepakket gesneden groente voorgesneden groente sla tomaten komkommer paprika'
      WHEN input_text ILIKE ANY(ARRAY['%fruit%', '%appel%', '%peer%', '%banaan%']) 
        THEN 'fruit appel peer banaan sinaasappel mandarijn kiwi druiven aardbeien frambozen blauwe bessen'
      WHEN input_text ILIKE ANY(ARRAY['%aardappel%', '%pieper%']) 
        THEN 'aardappel aardappelen pieper piepers aardappeltjes krieltjes frietaardappelen bakaaardappelen kookaardappelen bildtstar doré nicola eigenheimer'
      
      -- Frozen Foods
      WHEN input_text ILIKE ANY(ARRAY['%diepvries%', '%bevroren%']) 
        THEN 'diepvries bevroren diepvriesgroenten diepvriesfruit diepvriesmaaltijd diepvriespizza diepvriessnacks iglo dr oetker mora beckers'
      
      -- Baby Products
      WHEN input_text ILIKE ANY(ARRAY['%luier%', '%pamper%']) 
        THEN 'luier luiers pamper pampers huggies kruidvat babyluiers zwemluiers'
      WHEN input_text ILIKE ANY(ARRAY['%babyvoeding%', '%nutrilon%']) 
        THEN 'babyvoeding nutrilon hero olvarit ella s kitchen nutricia'
      
      -- Pet Food
      WHEN input_text ILIKE ANY(ARRAY['%hond%', '%hondenvoer%']) 
        THEN 'hond hondenvoer hondenbrokken pedigree royal canin eukanuba rodi prins'
      WHEN input_text ILIKE ANY(ARRAY['%kat%', '%kattenvoer%']) 
        THEN 'kat kattenvoer kattenbrokken whiskas felix sheba purina one'
      
      -- Brands (map brands to their product categories)
      WHEN input_text ILIKE ANY(ARRAY['%ariel%', '%persil%', '%omo%', '%robijn%']) 
        THEN 'wasmiddel waspoeder wasgel ariel persil omo robijn'
      WHEN input_text ILIKE ANY(ARRAY['%heineken%', '%grolsch%', '%amstel%', '%hertog%jan%']) 
        THEN 'bier pils heineken grolsch amstel hertog jan'
      WHEN input_text ILIKE ANY(ARRAY['%douwe%egberts%', '%de%koffie%', '%senseo%', '%nespresso%']) 
        THEN 'koffie koffiebonen koffiepads douwe egberts senseo nespresso'
      WHEN input_text ILIKE ANY(ARRAY['%unox%', '%knorr%', '%maggi%']) 
        THEN 'soep saus bouillon unox knorr maggi'
      
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
    semantic_weight float DEFAULT 1.0,
    only_sales boolean DEFAULT true
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
          WHEN LOWER(s.product_name) LIKE ANY(STRING_TO_ARRAY(LOWER(expanded_query), ' ')::text[]) THEN 1.0
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
      WHERE 
        -- Only apply valid_until filter when only_sales is true
        (NOT only_sales OR s.valid_until >= current_date)
        -- Pre-filter to reduce irrelevant matches
        AND (
          EXISTS (
            SELECT 1 
            FROM unnest(string_to_array(LOWER(expanded_query), ' ')) word
            WHERE LOWER(s.product_name) LIKE '%' || word || '%'
              OR LOWER(s.description) LIKE '%' || word || '%'
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