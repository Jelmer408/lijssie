-- Add discount field to receipt_items
ALTER TABLE receipt_items
ADD COLUMN discount decimal(10,2);

-- Update RLS policies
ALTER POLICY "Users can view receipt items from their household expenses" ON receipt_items
USING (
  expense_id IN (
    SELECT e.id 
    FROM expenses e
    JOIN households h ON h.id = e.household_id
    JOIN household_members hm ON hm.household_id = h.id
    WHERE hm.user_id = auth.uid()
  )
); 