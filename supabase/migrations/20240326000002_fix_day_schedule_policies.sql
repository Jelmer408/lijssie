-- Drop existing policies
drop policy if exists "Users can only view their household's day schedule" on public.day_schedule;
drop policy if exists "Enable select for household members" on public.day_schedule;
drop policy if exists "Enable insert for household members" on public.day_schedule;
drop policy if exists "Enable update for household members" on public.day_schedule;
drop policy if exists "Enable delete for household members" on public.day_schedule;

-- Create new policies for day_schedule
create policy "Enable select for household members"
  on public.day_schedule for select
  to authenticated
  using (
    -- User can see schedules of households they belong to
    exists (
      select 1 
      from public.households h
      where h.id = day_schedule.household_id
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

create policy "Enable insert for household members"
  on public.day_schedule for insert
  to authenticated
  with check (
    -- User can insert schedules for households they belong to
    exists (
      select 1 
      from public.households h
      where h.id = household_id
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

create policy "Enable update for household members"
  on public.day_schedule for update
  to authenticated
  using (
    -- User can update schedules for households they belong to
    exists (
      select 1 
      from public.households h
      where h.id = household_id
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

create policy "Enable delete for household members"
  on public.day_schedule for delete
  to authenticated
  using (
    -- User can delete schedules for households they belong to
    exists (
      select 1 
      from public.households h
      where h.id = household_id
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