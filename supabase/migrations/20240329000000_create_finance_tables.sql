-- Step 1: Drop tables if they exist (in reverse order of dependencies)
drop table if exists public.member_balances;
drop table if exists public.expense_shares;
drop table if exists public.settlements;
drop table if exists public.expense_items;
drop table if exists public.expenses;

-- Step 2: Create core tables (in order of dependencies)
create table public.expenses (
    id uuid default gen_random_uuid() primary key,
    household_id uuid references public.households(id) on delete cascade not null,
    created_by uuid references auth.users(id) not null,
    paid_by uuid references auth.users(id) not null,
    title text not null,
    store_name text,
    amount decimal(10,2) not null,
    date date not null default current_date,
    category text,
    receipt_url text,
    split_type text not null default 'equal',
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint valid_split_type check (split_type in ('equal', 'percentage', 'fixed', 'shares'))
);

create table public.expense_shares (
    id uuid default gen_random_uuid() primary key,
    expense_id uuid references public.expenses(id) on delete cascade not null,
    user_id uuid references auth.users(id) not null,
    shares integer not null default 0,
    amount decimal(10,2) not null,
    created_at timestamptz default now() not null,
    unique(expense_id, user_id)
);

create table public.member_balances (
    id uuid default gen_random_uuid() primary key,
    household_id uuid references public.households(id) on delete cascade not null,
    from_user_id uuid references auth.users(id) not null,
    to_user_id uuid references auth.users(id) not null,
    balance decimal(10,2) not null default 0,
    updated_at timestamptz default now() not null,
    unique(household_id, from_user_id, to_user_id)
);

create table public.expense_items (
    id uuid default gen_random_uuid() primary key,
    expense_id uuid references public.expenses(id) on delete cascade not null,
    name text not null,
    amount decimal(10,2) not null,
    category text,
    split_type text not null default 'equal',
    shared_with uuid[] not null,
    created_at timestamptz default now() not null
);

create table public.settlements (
    id uuid default gen_random_uuid() primary key,
    household_id uuid references public.households(id) on delete cascade not null,
    from_user_id uuid references auth.users(id) not null,
    to_user_id uuid references auth.users(id) not null,
    amount decimal(10,2) not null,
    method text not null default 'other',
    note text,
    settled_at timestamptz default now() not null,
    created_at timestamptz default now() not null,
    constraint valid_method check (method in ('cash', 'tikkie', 'ideal', 'other'))
);

-- Step 3: Create basic indexes
create index expenses_household_id_idx on public.expenses(household_id);
create index expenses_paid_by_idx on public.expenses(paid_by);
create index expenses_date_idx on public.expenses(date);
create index expense_items_expense_id_idx on public.expense_items(expense_id);
create index settlements_household_id_idx on public.settlements(household_id);
create index settlements_from_user_id_idx on public.settlements(from_user_id);
create index settlements_to_user_id_idx on public.settlements(to_user_id);
create index expense_shares_expense_id_idx on public.expense_shares(expense_id);
create index expense_shares_user_id_idx on public.expense_shares(user_id);
create index member_balances_household_id_idx on public.member_balances(household_id);
create index member_balances_from_user_id_idx on public.member_balances(from_user_id);
create index member_balances_to_user_id_idx on public.member_balances(to_user_id);

-- Enable RLS
ALTER TABLE expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_balances ENABLE ROW LEVEL SECURITY;

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

-- Create policies for expense_shares
CREATE POLICY "Users can insert expense shares for their household"
ON expense_shares FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN household_members hm ON e.household_id = hm.household_id
    WHERE e.id = expense_shares.expense_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view expense shares for their household"
ON expense_shares FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN household_members hm ON e.household_id = hm.household_id
    WHERE e.id = expense_shares.expense_id
    AND hm.user_id = auth.uid()
  )
);

-- Add UPDATE policy for expense_shares
CREATE POLICY "Users can update expense shares for their household"
ON expense_shares FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.user_id = auth.uid()
    AND hm.household_id = (
      SELECT household_id FROM expenses WHERE id = expense_shares.expense_id
    )
  )
);

-- Create member_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_balances (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id, from_user_id, to_user_id)
);

-- Function to update member balances
CREATE OR REPLACE FUNCTION update_member_balances()
RETURNS TRIGGER AS $$
DECLARE
  v_household_id uuid;
  v_expense_amount numeric;
  v_paid_by uuid;
BEGIN
  -- Get household_id and paid_by from the expense
  SELECT household_id, paid_by, amount INTO v_household_id, v_paid_by, v_expense_amount
  FROM expenses WHERE id = NEW.expense_id;

  -- If this is a share for the payer, skip it (we'll handle it when processing other shares)
  IF NEW.user_id = v_paid_by THEN
    RETURN NEW;
  END IF;

  -- Update or insert balance from the user to the payer
  INSERT INTO member_balances (household_id, from_user_id, to_user_id, balance)
  VALUES (v_household_id, NEW.user_id, v_paid_by, ABS(NEW.amount))
  ON CONFLICT (household_id, from_user_id, to_user_id)
  DO UPDATE SET 
    balance = member_balances.balance + ABS(NEW.amount),
    updated_at = now();

  -- Also maintain the reverse relationship with 0 balance
  INSERT INTO member_balances (household_id, from_user_id, to_user_id, balance)
  VALUES (v_household_id, v_paid_by, NEW.user_id, 0)
  ON CONFLICT (household_id, from_user_id, to_user_id)
  DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle expense share deletion
CREATE OR REPLACE FUNCTION handle_expense_share_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_household_id uuid;
  v_paid_by uuid;
BEGIN
  -- Get household_id and paid_by from the expense
  SELECT household_id, paid_by INTO v_household_id, v_paid_by
  FROM expenses WHERE id = OLD.expense_id;

  -- If this is a share for the payer, skip it
  IF OLD.user_id = v_paid_by THEN
    RETURN OLD;
  END IF;

  -- Update balance by subtracting the amount
  UPDATE member_balances
  SET 
    balance = balance - ABS(OLD.amount),
    updated_at = now()
  WHERE 
    household_id = v_household_id 
    AND from_user_id = OLD.user_id 
    AND to_user_id = v_paid_by;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inserting/updating expense shares
DROP TRIGGER IF EXISTS update_member_balances_on_expense_share ON expense_shares;
CREATE TRIGGER update_member_balances_on_expense_share
  AFTER INSERT OR UPDATE ON expense_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_member_balances();

-- Trigger for deleting expense shares
DROP TRIGGER IF EXISTS handle_expense_share_deletion ON expense_shares;
CREATE TRIGGER handle_expense_share_deletion
  BEFORE DELETE ON expense_shares
  FOR EACH ROW
  EXECUTE FUNCTION handle_expense_share_deletion();

-- Add RLS policies
ALTER TABLE member_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view balances from their household"
  ON member_balances FOR SELECT
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert/update balances"
  ON member_balances FOR ALL
  USING (true)
  WITH CHECK (true); 