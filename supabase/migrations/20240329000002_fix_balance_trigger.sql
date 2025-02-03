-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_balances_after_expense_share ON expense_shares;
DROP FUNCTION IF EXISTS update_member_balances_on_expense();

-- Create function to update member balances
CREATE OR REPLACE FUNCTION update_member_balances_on_expense()
RETURNS TRIGGER AS $$
DECLARE
    v_household_id uuid;
    v_paid_by uuid;
    v_total_amount decimal(10,2);
BEGIN
    -- Get the household_id and paid_by from the expense
    SELECT household_id, paid_by, amount 
    INTO v_household_id, v_paid_by, v_total_amount
    FROM expenses 
    WHERE id = NEW.expense_id;

    -- If this is the payer's share (negative amount), skip balance updates
    -- The balances will be updated when processing other members' shares
    IF NEW.user_id = v_paid_by THEN
        RETURN NEW;
    END IF;

    -- Update or insert balance for payer -> current user (payer gets money)
    INSERT INTO member_balances (household_id, from_user_id, to_user_id, balance)
    VALUES (v_household_id, NEW.user_id, v_paid_by, NEW.amount)
    ON CONFLICT (household_id, from_user_id, to_user_id)
    DO UPDATE SET 
        balance = member_balances.balance + NEW.amount,
        updated_at = now();

    -- Update or insert inverse balance for current user -> payer (user owes money)
    INSERT INTO member_balances (household_id, from_user_id, to_user_id, balance)
    VALUES (v_household_id, v_paid_by, NEW.user_id, -NEW.amount)
    ON CONFLICT (household_id, from_user_id, to_user_id)
    DO UPDATE SET 
        balance = member_balances.balance - NEW.amount,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_balances_after_expense_share
    AFTER INSERT ON expense_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_member_balances_on_expense(); 