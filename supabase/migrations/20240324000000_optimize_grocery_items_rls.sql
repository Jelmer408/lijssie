-- Drop all existing policies
drop policy if exists "Enable read access for all users" on public.grocery_items;
drop policy if exists "Enable insert for authenticated users" on public.grocery_items;
drop policy if exists "Enable update for authenticated users" on public.grocery_items;
drop policy if exists "Enable delete for authenticated users" on public.grocery_items;
drop policy if exists "Users can only view their household's grocery items" on public.grocery_items;

-- Create optimized policies using subqueries
create policy "Users can view items from their household"
on public.grocery_items
for select
using (
  household_id in (
    select household_id 
    from public.household_members 
    where user_id = auth.uid()
  )
);

create policy "Users can insert items into their household"
on public.grocery_items
for insert
with check (
  household_id in (
    select household_id 
    from public.household_members 
    where user_id = auth.uid()
  )
);

create policy "Users can update items in their household"
on public.grocery_items
for update
using (
  household_id in (
    select household_id 
    from public.household_members 
    where user_id = auth.uid()
  )
);

create policy "Users can delete items from their household"
on public.grocery_items
for delete
using (
  household_id in (
    select household_id 
    from public.household_members 
    where user_id = auth.uid()
  )
); 