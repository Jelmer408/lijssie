-- Create a view for household access checks
create or replace view household_access as
select distinct
    h.id as household_id,
    auth.uid() as user_id,
    true as has_access
from public.households h
where 
    h.created_by = auth.uid()
    or exists (
        select 1 
        from public.household_members m 
        where m.household_id = h.id 
        and m.user_id = auth.uid()
    );

-- Drop existing policies
drop policy if exists "Enable select for own memberships" on public.household_members;
drop policy if exists "Enable select for household members" on public.household_members;
drop policy if exists "Enable insert for own memberships" on public.household_members;
drop policy if exists "Enable update for own memberships" on public.household_members;
drop policy if exists "Enable delete for own memberships" on public.household_members;

-- Simplified policies for household_members using the view
create policy "Enable select for household members"
  on public.household_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 
      from household_access ha
      where ha.household_id = household_members.household_id
    )
  );

create policy "Enable insert for household members"
  on public.household_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  );

create policy "Enable update for household members"
  on public.household_members for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  );

create policy "Enable delete for household members"
  on public.household_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 
      from public.households h
      where h.id = household_id
      and h.created_by = auth.uid()
    )
  );

-- Drop existing day_schedule policies
drop policy if exists "Enable select for household members" on public.day_schedule;
drop policy if exists "Enable insert for household members" on public.day_schedule;
drop policy if exists "Enable update for household members" on public.day_schedule;
drop policy if exists "Enable delete for household members" on public.day_schedule;

-- Simplified policies for day_schedule using the view
create policy "Enable select for household members"
  on public.day_schedule for select
  to authenticated
  using (
    exists (
      select 1 
      from household_access ha
      where ha.household_id = day_schedule.household_id
    )
  );

create policy "Enable insert for household members"
  on public.day_schedule for insert
  to authenticated
  with check (
    exists (
      select 1 
      from household_access ha
      where ha.household_id = household_id
    )
  );

create policy "Enable update for household members"
  on public.day_schedule for update
  to authenticated
  using (
    exists (
      select 1 
      from household_access ha
      where ha.household_id = household_id
    )
  );

create policy "Enable delete for household members"
  on public.day_schedule for delete
  to authenticated
  using (
    exists (
      select 1 
      from household_access ha
      where ha.household_id = household_id
    )
  );

-- Enable RLS on the view
alter view household_access security definer; 