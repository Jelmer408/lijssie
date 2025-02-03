-- First drop the policy on auth.users that depends on household_members
drop policy if exists "Allow users to view other users in same household" on auth.users;

-- First drop policies that depend on household_members
drop policy if exists "Users can only view their household's grocery items" on public.grocery_items;
drop policy if exists "Users can only view their household's meal proposals" on public.meal_proposals;
drop policy if exists "Users can only view their household's store status" on public.store_status;
drop policy if exists "Users can only view their household's grocery history" on public.grocery_history;
drop policy if exists "Users can only view their household's day schedule" on public.day_schedule;

-- Drop existing household_members policies
drop policy if exists "Enable all for authenticated users" on public.household_members;
drop policy if exists "Enable insert for authenticated users" on public.household_members;
drop policy if exists "Enable select for members" on public.household_members;
drop policy if exists "Enable update for household creator" on public.household_members;
drop policy if exists "Enable delete for household creator" on public.household_members;

-- Create view for user profiles
create or replace view public.profiles as
  select 
    id,
    email,
    raw_user_metadata
  from auth.users;

-- Recreate the household_members table with proper constraints
drop table if exists public.household_members cascade;
create table public.household_members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'member')),
  user_name text,
  email text not null,
  unique(household_id, user_id)
);

-- Enable RLS
alter table public.household_members enable row level security;

-- Create policies for household_members
create policy "Enable select for authenticated users"
  on public.household_members for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users"
  on public.household_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Enable update for household members"
  on public.household_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Enable delete for household members"
  on public.household_members for delete
  to authenticated
  using (auth.uid() = user_id);

-- Add indexes for better performance
create index if not exists household_members_household_id_idx on public.household_members(household_id);
create index if not exists household_members_user_id_idx on public.household_members(user_id);

-- Create policy for profiles view
create policy "Allow users to view profiles in same household"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.household_members as m1
      inner join public.household_members as m2
      on m1.household_id = m2.household_id
      where m1.user_id = auth.uid()
      and m2.user_id = profiles.id
    )
  );

-- Recreate policies for related tables
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

-- Recreate the auth.users policy
create policy "Allow users to view other users in same household"
  on auth.users for select
  using (
    exists (
      select 1 from public.household_members as m1
      inner join public.household_members as m2
      on m1.household_id = m2.household_id
      where m1.user_id = auth.uid()
      and m2.user_id = auth.users.id
    )
  );
  