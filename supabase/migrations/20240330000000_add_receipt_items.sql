-- Create receipt_items table
create table if not exists receipt_items (
  id uuid default uuid_generate_v4() primary key,
  expense_id uuid references expenses(id) on delete cascade,
  name text not null,
  original_price decimal(10,2),
  discounted_price decimal(10,2),
  quantity integer default 1,
  store_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table receipt_items enable row level security;

create policy "Users can view receipt items from their household"
  on receipt_items for select
  using (
    exists (
      select 1 from expenses e
      join household_members hm on hm.household_id = e.household_id
      where e.id = receipt_items.expense_id
      and hm.user_id = auth.uid()
    )
  );

create policy "Users can insert receipt items for their expenses"
  on receipt_items for insert
  with check (
    exists (
      select 1 from expenses e
      where e.id = receipt_items.expense_id
      and e.created_by = auth.uid()
    )
  );

create policy "Users can update receipt items from their expenses"
  on receipt_items for update
  using (
    exists (
      select 1 from expenses e
      where e.id = receipt_items.expense_id
      and e.created_by = auth.uid()
    )
  );

create policy "Users can delete receipt items from their expenses"
  on receipt_items for delete
  using (
    exists (
      select 1 from expenses e
      where e.id = receipt_items.expense_id
      and e.created_by = auth.uid()
    )
  );

-- Add store_name to expenses table if not exists
alter table expenses 
add column if not exists store_name text,
add column if not exists has_receipt_items boolean default false; 