CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS grocery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '1',
    unit TEXT NOT NULL DEFAULT 'st',
    category TEXT NOT NULL DEFAULT 'Overig',
    priority BOOLEAN NOT NULL DEFAULT false,
    completed BOOLEAN NOT NULL DEFAULT false,
    emoji TEXT,
    user_id UUID NOT NULL,
    user_name TEXT,
    user_avatar TEXT,
    updated_at TIMESTAMPTZ,
    household_id UUID,
    supermarket TEXT,
    current_price TEXT,
    original_price TEXT,
    sale_type TEXT,
    valid_until TIMESTAMPTZ,
    image_url TEXT,
    is_deleted BOOLEAN DEFAULT false,
    subcategory TEXT,
    product_url TEXT,
    product_id UUID
);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_grocery_items_user_id ON grocery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_household_id ON grocery_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_completed ON grocery_items(completed);
CREATE INDEX IF NOT EXISTS idx_grocery_items_product_id ON grocery_items(product_id); 