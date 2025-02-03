-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert balances for their household" ON member_balances;
DROP POLICY IF EXISTS "Users can view balances for their household" ON member_balances;

-- Create more permissive policies for member_balances
CREATE POLICY "Enable all operations for users in same household"
ON member_balances FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.household_id = member_balances.household_id 
    AND hm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm 
    WHERE hm.household_id = member_balances.household_id 
    AND hm.user_id = auth.uid()
  )
); 