-- Drop policies created in previous migration
drop policy if exists "Enable insert for authenticated users" on public.households;
drop policy if exists "Enable select for users who are members" on public.households;
drop policy if exists "Enable update for admin members" on public.households;
drop policy if exists "Enable all operations for household members" on public.household_members;
drop policy if exists "Enable operations for household members" on public.household_members;
drop policy if exists "Enable all operations for household members" on public.category_order;
drop policy if exists "Enable operations for household members" on public.category_order;

-- Disable and re-enable RLS
alter table public.households disable row level security;
alter table public.households enable row level security;
alter table public.household_members disable row level security;
alter table public.household_members enable row level security;
alter table public.category_order disable row level security;
alter table public.category_order enable row level security;

-- Restore original policies
create policy "Enable insert for authenticated users"
  on public.households for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Enable select for users who are members"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
    )
  );

create policy "Enable update for admin members"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
      and household_members.role = 'admin'
    )
  );

-- Add policy for household_members
create policy "Enable operations for household members"
  on public.household_members
  for all
  using (
    exists (
      select 1 from public.households
      where households.id = household_id
      and (
        households.created_by = auth.uid()
        OR exists (
          select 1 from public.household_members m
          where m.household_id = household_id
          and m.user_id = auth.uid()
          and m.role = 'admin'
        )
      )
    )
  );

-- Add policy for category_order
create policy "Enable operations for household members"
  on public.category_order
  for all
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = category_order.household_id
      and household_members.user_id = auth.uid()
    )
  ); 