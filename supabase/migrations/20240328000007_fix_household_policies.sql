-- Drop existing overly permissive policy
drop policy if exists "Enable all operations for authenticated users" on public.households;

-- Create specific policies for households
create policy "Enable household creation for authenticated users"
  on public.households for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Enable household viewing for members"
  on public.households for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Enable household updates for admin members"
  on public.households for update
  to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_members.household_id = id
      and household_members.user_id = auth.uid()
    )
  ); 