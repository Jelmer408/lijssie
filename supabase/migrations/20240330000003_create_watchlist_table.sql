-- Create the product_watchlist table
CREATE TABLE product_watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add a unique constraint to prevent duplicate products in a household
ALTER TABLE product_watchlist 
ADD CONSTRAINT product_watchlist_product_id_household_id_key 
UNIQUE (product_id, household_id);

-- Create indexes for faster lookups
CREATE INDEX idx_product_watchlist_household ON product_watchlist(household_id);
CREATE INDEX idx_product_watchlist_product ON product_watchlist(product_id);

-- Enable Row Level Security
ALTER TABLE product_watchlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for household-based access
CREATE POLICY "Users can view their household watchlist items"
ON product_watchlist
FOR SELECT
USING (
    household_id IN (
        SELECT household_id 
        FROM household_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert watchlist items for their households"
ON product_watchlist
FOR INSERT
WITH CHECK (
    household_id IN (
        SELECT household_id 
        FROM household_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their household watchlist items"
ON product_watchlist
FOR DELETE
USING (
    household_id IN (
        SELECT household_id 
        FROM household_members 
        WHERE user_id = auth.uid()
    )
);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_product_watchlist_updated_at
    BEFORE UPDATE ON product_watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 