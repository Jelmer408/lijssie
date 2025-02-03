-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    quantity_info TEXT,
    last_updated TEXT,
    image_url TEXT,
    category TEXT,
    supermarket_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products (updated_at);

-- Create a GIN index for efficient JSON querying
CREATE INDEX IF NOT EXISTS idx_products_supermarket_data ON products USING GIN (supermarket_data);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE products IS 'Stores product information scraped from schapr.nl';
COMMENT ON COLUMN products.id IS 'Unique identifier for the product';
COMMENT ON COLUMN products.title IS 'Product name/title';
COMMENT ON COLUMN products.quantity_info IS 'Product quantity information (e.g., weight, volume)';
COMMENT ON COLUMN products.last_updated IS 'When the product was last updated on schapr.nl';
COMMENT ON COLUMN products.image_url IS 'URL to the product image';
COMMENT ON COLUMN products.category IS 'Product category';
COMMENT ON COLUMN products.supermarket_data IS 'JSON containing price and availability data per supermarket';
COMMENT ON COLUMN products.created_at IS 'When this record was first created';
COMMENT ON COLUMN products.updated_at IS 'When this record was last updated'; 