-- Create enum for supermarket names
CREATE TYPE supermarket_name AS ENUM ('ah', 'jumbo', 'dirk');

-- Create table for supermarket offers
CREATE TABLE IF NOT EXISTS supermarket_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supermarket supermarket_name NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    original_price DECIMAL(10,2),
    offer_price DECIMAL(10,2) NOT NULL,
    discount_percentage INTEGER,
    sale_type TEXT,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_supermarket_offers_supermarket ON supermarket_offers(supermarket);
CREATE INDEX idx_supermarket_offers_valid_dates ON supermarket_offers(valid_from, valid_until);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_supermarket_offers_updated_at
    BEFORE UPDATE ON supermarket_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE supermarket_offers ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all authenticated users"
    ON supermarket_offers
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert/update only to service role
CREATE POLICY "Allow insert/update only to service role"
    ON supermarket_offers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true); 