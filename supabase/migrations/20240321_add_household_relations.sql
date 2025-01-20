-- Add household_id to grocery_items
alter table public.grocery_items
add column household_id uuid references public.households(id);

-- Add household_id to meal_proposals
alter table public.meal_proposals
add column household_id uuid references public.households(id);

-- Add household_id to store_status
alter table public.store_status
add column household_id uuid references public.households(id);

-- Add household_id to grocery_history
alter table public.grocery_history
add column household_id uuid references public.households(id);

-- Add household_id to day_schedule
alter table public.day_schedule
add column household_id uuid references public.households(id);

-- Update RLS policies to include household check
create policy "Users can only view their household's grocery items"
  on public.grocery_items for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = grocery_items.household_id
      and user_id = auth.uid()
    )
  );

create policy "Users can only view their household's meal proposals"
  on public.meal_proposals for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = meal_proposals.household_id
      and user_id = auth.uid()
    )
  );

create policy "Users can only view their household's store status"
  on public.store_status for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = store_status.household_id
      and user_id = auth.uid()
    )
  );

create policy "Users can only view their household's grocery history"
  on public.grocery_history for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = grocery_history.household_id
      and user_id = auth.uid()
    )
  );

create policy "Users can only view their household's day schedule"
  on public.day_schedule for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = day_schedule.household_id
      and user_id = auth.uid()
    )
  ); 