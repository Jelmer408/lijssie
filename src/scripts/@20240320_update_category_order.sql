-- Drop the existing table
DROP TABLE IF EXISTS category_order;

-- Create the table with the new structure
CREATE TABLE category_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    household_id UUID REFERENCES households(id) NOT NULL,
    "order" JSONB NOT NULL,
    CONSTRAINT unique_household_order UNIQUE (household_id)
);

-- Create index for faster household_id lookups
CREATE INDEX IF NOT EXISTS category_order_household_id_idx ON category_order(household_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_category_order_updated_at ON category_order;

CREATE TRIGGER update_category_order_updated_at
    BEFORE UPDATE ON category_order
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default order for all households
INSERT INTO category_order (household_id, "order")
SELECT id, '[
  "Zuivel",
  "Groenten",
  "Fruit",
  "Vlees",
  "Vis",
  "Granen",
  "Kruiden",
  "Aziatisch",
  "Snacks",
  "Dranken",
  "Beleg",
  "Huishoudartikelen",
  "Diepvries",
  "Conserven",
  "Sauzen",
  "Pasta",
  "Ontbijt",
  "Snoep",
  "Chips",
  "Bakkerij",
  "Eieren",
  "Overig"
]'::jsonb
FROM households
ON CONFLICT (household_id) DO UPDATE 
SET "order" = EXCLUDED."order";

-- Create a function to ensure all households have a category order
CREATE OR REPLACE FUNCTION ensure_household_category_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO category_order (household_id, "order")
  VALUES (NEW.id, '[
    "Zuivel",
    "Groenten",
    "Fruit",
    "Vlees",
    "Vis",
    "Granen",
    "Kruiden",
    "Aziatisch",
    "Snacks",
    "Dranken",
    "Beleg",
    "Huishoudartikelen",
    "Diepvries",
    "Conserven",
    "Sauzen",
    "Pasta",
    "Ontbijt",
    "Snoep",
    "Chips",
    "Bakkerij",
    "Eieren",
    "Overig"
  ]'::jsonb)
  ON CONFLICT (household_id) DO UPDATE 
  SET "order" = EXCLUDED."order";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create category order for new households
DROP TRIGGER IF EXISTS ensure_household_category_order_trigger ON households;

CREATE TRIGGER ensure_household_category_order_trigger
AFTER INSERT ON households
FOR EACH ROW
EXECUTE FUNCTION ensure_household_category_order();

-- Enable row level security
ALTER TABLE category_order ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and update their household's category order
CREATE POLICY "Users can view and update their household's category order"
    ON category_order
    FOR ALL
    USING (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )); 