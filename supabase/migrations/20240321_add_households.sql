-- Create households table
create table if not exists public.households (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  invite_code text unique not null,
  created_by uuid references auth.users(id) not null
);

-- Create household_members table for managing memberships
create table if not exists public.household_members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  household_id uuid references public.households(id) not null,
  user_id uuid references auth.users(id) not null,
  role text not null check (role in ('admin', 'member')),
  unique(household_id, user_id)
);

-- Add RLS policies for households
alter table public.households enable row level security;

create policy "Users can view households they are members of"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
      and user_id = auth.uid()
    )
  );

create policy "Users can create households"
  on public.households for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Only admins can update household details"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Add RLS policies for household_members
alter table public.household_members enable row level security;

create policy "Users can view members of their households"
  on public.household_members for select
  using (
    exists (
      select 1 from public.household_members as my_memberships
      where my_memberships.household_id = household_members.household_id
      and my_memberships.user_id = auth.uid()
    )
  );

create policy "Admins can manage household members"
  on public.household_members for all
  using (
    exists (
      select 1 from public.household_members
      where household_id = household_members.household_id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.households to authenticated, anon;
grant all on public.household_members to authenticated, anon;

-- Add a policy for returning the inserted row
create policy "Users can view their created households"
  on public.households for select
  using (auth.uid() = created_by); 