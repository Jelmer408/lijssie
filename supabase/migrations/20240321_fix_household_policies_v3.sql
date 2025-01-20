-- First, drop all existing policies
drop policy if exists "Users can view households they are members of" on public.households;
drop policy if exists "Users can create households" on public.households;
drop policy if exists "Only admins can update household details" on public.households;
drop policy if exists "Users can view their created households" on public.households;
drop policy if exists "Enable household creation" on public.households;
drop policy if exists "Enable household select" on public.households;
drop policy if exists "Enable household update by admin" on public.households;

drop policy if exists "Users can view members of their households" on public.household_members;
drop policy if exists "Admins can manage household members" on public.household_members;
drop policy if exists "Enable member creation" on public.household_members;
drop policy if exists "Enable member select" on public.household_members;
drop policy if exists "Enable member update by admin" on public.household_members;
drop policy if exists "Enable member deletion by admin" on public.household_members;

-- Simple policies for households
create policy "Enable all operations for authenticated users"
  on public.households for all
  to authenticated
  using (true)
  with check (true);

-- Simple policies for household_members
create policy "Enable insert for authenticated users"
  on public.household_members for insert
  to authenticated
  with check (true);

create policy "Enable select for members"
  on public.household_members for select
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

create policy "Enable update for household creator"
  on public.household_members for update
  using (
    exists (
      select 1 from public.households
      where id = household_members.household_id
      and created_by = auth.uid()
    )
  );

create policy "Enable delete for household creator"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.households
      where id = household_members.household_id
      and created_by = auth.uid()
    )
  ); 