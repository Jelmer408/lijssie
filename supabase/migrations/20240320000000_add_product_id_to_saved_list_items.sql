-- Add product_id and subcategory columns to saved_list_items table
ALTER TABLE saved_list_items
ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id),
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN saved_list_items.product_id IS 'Reference to the product in the products table for price tracking';
COMMENT ON COLUMN saved_list_items.subcategory IS 'Subcategory of the item for better categorization';

-- Create index on product_id for better query performance
CREATE INDEX IF NOT EXISTS saved_list_items_product_id_idx ON saved_list_items(product_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saved list items" ON saved_list_items;
DROP POLICY IF EXISTS "Users can insert their own saved list items" ON saved_list_items;
DROP POLICY IF EXISTS "Users can update their own saved list items" ON saved_list_items;

-- Create new policies
CREATE POLICY "Users can view saved list items from their household's lists"
ON saved_list_items FOR SELECT
USING (
    list_id IN (
        SELECT id 
        FROM saved_lists 
        WHERE household_id IN (
            SELECT household_id 
            FROM household_members 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert items into their household's lists"
ON saved_list_items FOR INSERT
WITH CHECK (
    list_id IN (
        SELECT id 
        FROM saved_lists 
        WHERE household_id IN (
            SELECT household_id 
            FROM household_members 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update items in their household's lists"
ON saved_list_items FOR UPDATE
USING (
    list_id IN (
        SELECT id 
        FROM saved_lists 
        WHERE household_id IN (
            SELECT household_id 
            FROM household_members 
            WHERE user_id = auth.uid()
        )
    )
); 