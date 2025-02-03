-- Drop existing policies first
drop policy if exists "Enable select for household members" on public.category_order;
drop policy if exists "Enable insert for household members" on public.category_order;
drop policy if exists "Enable insert for household members and creators" on public.category_order;
drop policy if exists "Enable update for household members" on public.category_order;
drop policy if exists "Enable delete for household members" on public.category_order;

-- Enable RLS
alter table public.category_order enable row level security;

-- Create policies
create policy "Enable select for household members"
  on public.category_order for select
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

create policy "Enable insert for authenticated users"
  on public.category_order for insert
  to authenticated
  with check (true);

create policy "Enable update for household members"
  on public.category_order for update
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

create policy "Enable delete for household members"
  on public.category_order for delete
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  ); 