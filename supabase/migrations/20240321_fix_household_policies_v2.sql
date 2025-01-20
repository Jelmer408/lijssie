-- Drop all existing policies first
drop policy if exists "Users can view households they are members of" on public.households;
drop policy if exists "Users can create households" on public.households;
drop policy if exists "Only admins can update household details" on public.households;
drop policy if exists "Users can view members of their households" on public.household_members;
drop policy if exists "Admins can manage household members" on public.household_members;
drop policy if exists "Enable insert for authenticated users" on public.households;
drop policy if exists "Enable select for users who are members" on public.households;
drop policy if exists "Enable update for admin members" on public.households;
drop policy if exists "Enable insert for new members" on public.household_members;
drop policy if exists "Enable select for household members" on public.household_members;
drop policy if exists "Enable update for admins" on public.household_members;
drop policy if exists "Enable delete for admins" on public.household_members;

-- Households policies
create policy "Enable household creation"
  on public.households for insert
  to authenticated
  with check (true);

create policy "Enable household select"
  on public.households for select
  using (
    id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
    or
    created_by = auth.uid()
  );

create policy "Enable household update by admin"
  on public.households for update
  using (created_by = auth.uid());

-- Household members policies
create policy "Enable member creation"
  on public.household_members for insert
  to authenticated
  with check (
    -- Allow if user is joining themselves
    user_id = auth.uid()
    or
    -- Or if user is the household creator
    exists (
      select 1 from public.households
      where id = household_id
      and created_by = auth.uid()
    )
  );

create policy "Enable member select"
  on public.household_members for select
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

create policy "Enable member update by admin"
  on public.household_members for update
  using (
    exists (
      select 1 from public.households
      where id = household_id
      and created_by = auth.uid()
    )
  );

create policy "Enable member deletion by admin"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.households
      where id = household_id
      and created_by = auth.uid()
    )
  ); 