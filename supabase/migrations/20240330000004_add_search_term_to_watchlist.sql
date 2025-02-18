-- Add search_term column to product_watchlist table
ALTER TABLE product_watchlist
ADD COLUMN IF NOT EXISTS search_term TEXT;

-- Update constraints to allow either product_id or search_term
ALTER TABLE product_watchlist
DROP CONSTRAINT IF EXISTS product_watchlist_product_or_search_term_check;

ALTER TABLE product_watchlist
ADD CONSTRAINT product_watchlist_product_or_search_term_check
CHECK (
    (product_id IS NOT NULL AND search_term IS NULL) OR
    (product_id IS NULL AND search_term IS NOT NULL)
);

-- Add unique constraint for search terms per household
ALTER TABLE product_watchlist
DROP CONSTRAINT IF EXISTS product_watchlist_household_search_term_unique;

ALTER TABLE product_watchlist
ADD CONSTRAINT product_watchlist_household_search_term_unique 
UNIQUE (household_id, search_term);

-- Create index for faster search term lookups
CREATE INDEX IF NOT EXISTS idx_product_watchlist_search_term 
ON product_watchlist(search_term);

-- Update RLS policies to include search_term
DROP POLICY IF EXISTS "Users can view their household watchlist items" ON product_watchlist;
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

DROP POLICY IF EXISTS "Users can insert watchlist items for their households" ON product_watchlist;
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