-- First, drop all existing policies
drop policy if exists "Enable all operations for authenticated users" on public.households;
drop policy if exists "Enable insert for authenticated users" on public.households;
drop policy if exists "Enable select for users who are members" on public.households;
drop policy if exists "Enable update for admin members" on public.households;
drop policy if exists "Enable household creation" on public.households;
drop policy if exists "Enable household select" on public.households;
drop policy if exists "Enable household update by admin" on public.households;

-- Enable RLS
alter table public.households enable row level security;

-- Create policies for households
create policy "Enable insert for authenticated users"
  on public.households for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Enable select for users who are members"
  on public.households for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
    )
    OR auth.uid() = created_by
  );

create policy "Enable update for admin members"
  on public.households for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
      and household_members.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
      and household_members.role = 'admin'
    )
  );

-- Drop existing category_order policies
drop policy if exists "Enable select for household members" on public.category_order;
drop policy if exists "Enable insert for household members" on public.category_order;
drop policy if exists "Enable insert for authenticated users" on public.category_order;
drop policy if exists "Enable update for household members" on public.category_order;
drop policy if exists "Enable delete for household members" on public.category_order;
drop policy if exists "Enable all operations for authenticated users" on public.category_order;
drop policy if exists "Enable insert for household creators" on public.category_order;

-- Enable RLS
alter table public.category_order enable row level security;

-- Create policies for category_order
create policy "Enable insert for household creators"
  on public.category_order for insert
  to authenticated
  with check (
    exists (
      select 1 from public.households
      where households.id = household_id
      and households.created_by = auth.uid()
    )
  );

create policy "Enable select for household members"
  on public.category_order for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = category_order.household_id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Enable update for household members"
  on public.category_order for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = category_order.household_id
      and household_members.user_id = auth.uid()
    )
  ); 