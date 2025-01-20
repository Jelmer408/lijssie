-- Drop the existing suggestions table if it exists
DROP TABLE IF EXISTS suggestions;

-- Create the suggestions table with all required fields
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🛒',
    explanation TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX suggestions_household_id_idx ON suggestions(household_id);
CREATE INDEX suggestions_created_at_idx ON suggestions(created_at);

-- Enable Row Level Security
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view suggestions for their households" ON suggestions
    FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create suggestions for their households" ON suggestions
    FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update suggestions for their households" ON suggestions
    FOR UPDATE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete suggestions for their households" ON suggestions
    FOR DELETE
    USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT ALL ON suggestions TO authenticated; 