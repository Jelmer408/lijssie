-- Drop all existing category_order policies
drop policy if exists "Enable select for household members" on public.category_order;
drop policy if exists "Enable insert for household members" on public.category_order;
drop policy if exists "Enable insert for authenticated users" on public.category_order;
drop policy if exists "Enable update for household members" on public.category_order;
drop policy if exists "Enable delete for household members" on public.category_order;
drop policy if exists "Enable all operations for authenticated users" on public.category_order;
drop policy if exists "Enable insert for household creators" on public.category_order;
drop policy if exists "Users can view and update their household's category order" on public.category_order;

-- Disable and re-enable RLS
alter table public.category_order disable row level security;
alter table public.category_order enable row level security;

-- Create a single policy for all operations
create policy "Enable operations for household members"
  on public.category_order
  for all
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = category_order.household_id
      and household_members.user_id = auth.uid()
    )
    OR
    exists (
      select 1 from public.households
      where households.id = category_order.household_id
      and households.created_by = auth.uid()
    )
  ); 