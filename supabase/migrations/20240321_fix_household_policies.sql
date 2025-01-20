-- Drop existing policies
drop policy if exists "Users can view households they are members of" on public.households;
drop policy if exists "Users can create households" on public.households;
drop policy if exists "Only admins can update household details" on public.households;
drop policy if exists "Users can view members of their households" on public.household_members;
drop policy if exists "Admins can manage household members" on public.household_members;

-- Create new policies for households
create policy "Enable insert for authenticated users"
  on public.households for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Enable select for users who are members"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = id
      and user_id = auth.uid()
    )
  );

create policy "Enable update for admin members"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members
      where household_id = id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Create new policies for household_members
create policy "Enable insert for new members"
  on public.household_members for insert
  to authenticated
  with check (
    -- Allow if user is joining themselves
    user_id = auth.uid() or
    -- Or if user is an admin of the household
    exists (
      select 1 from public.household_members
      where household_id = household_members.household_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Enable select for household members"
  on public.household_members for select
  using (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid()
    )
  );

create policy "Enable update for admins"
  on public.household_members for update
  using (
    exists (
      select 1 from public.household_members
      where household_id = household_members.household_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Enable delete for admins"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.household_members
      where household_id = household_members.household_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  ); 