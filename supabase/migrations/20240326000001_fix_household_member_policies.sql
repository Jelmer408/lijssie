-- Drop existing policies
drop policy if exists "Enable select for authenticated users" on public.household_members;
drop policy if exists "Enable insert for authenticated users" on public.household_members;
drop policy if exists "Enable update for household members" on public.household_members;
drop policy if exists "Enable delete for household members" on public.household_members;
drop policy if exists "Enable select for own memberships" on public.household_members;
drop policy if exists "Enable insert for own memberships" on public.household_members;
drop policy if exists "Enable update for own memberships" on public.household_members;
drop policy if exists "Enable delete for own memberships" on public.household_members;

-- Create new policies for household_members
create policy "Enable select for own memberships"
  on public.household_members for select
  to authenticated
  using (
    -- User can see their own memberships
    user_id = auth.uid()
  );

create policy "Enable select for household members"
  on public.household_members for select
  to authenticated
  using (
    -- User can see other members of households they belong to
    exists (
      select 1 
      from public.households h
      where h.id = household_members.household_id
      and (
        h.created_by = auth.uid() 
        or exists (
          select 1 
          from public.household_members m 
          where m.household_id = h.id 
          and m.user_id = auth.uid()
        )
      )
    )
  );

create policy "Enable insert for own memberships"
  on public.household_members for insert
  to authenticated
  with check (
    -- User can only insert their own membership
    user_id = auth.uid()
    or
    -- Or if they created the household
    exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  );

create policy "Enable update for own memberships"
  on public.household_members for update
  to authenticated
  using (
    -- User can update their own membership
    user_id = auth.uid()
    or
    -- Or if they created the household
    exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  );

create policy "Enable delete for own memberships"
  on public.household_members for delete
  to authenticated
  using (
    -- User can delete their own membership
    user_id = auth.uid()
    or
    -- Or if they created the household
    exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  ); 