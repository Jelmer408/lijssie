-- Drop existing table
DROP TABLE IF EXISTS products;

-- Create products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    weight TEXT,
    category TEXT,
    subcategory TEXT,
    main_category TEXT,
    price TEXT,
    price_per_unit TEXT,
    supermarket_data JSONB, -- Contains: name, logoUrl, price, pricePerUnit, offerText, offerEndDate
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_subcategory ON products(subcategory);
CREATE INDEX idx_products_main_category ON products(main_category);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_last_updated ON products(last_updated);

-- Add RLS policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access"
ON products FOR SELECT
TO anon
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access"
ON products FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 