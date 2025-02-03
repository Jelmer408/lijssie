-- Add policy to allow viewing households with invite code
create policy "Users can view households with invite code"
  on public.households for select
  using (true);

-- Update existing policy to be more specific
drop policy if exists "Users can view households they are members of" on public.households;
create policy "Users can view households they are members of"
  on public.households for all
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
      and user_id = auth.uid()
    )
  ); 