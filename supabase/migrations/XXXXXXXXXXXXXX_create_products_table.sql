CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    quantity_info TEXT,
    last_updated TEXT,
    image_url TEXT,
    category TEXT,
    subcategory TEXT,
    main_category TEXT,
    supermarket_data JSONB,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
); 