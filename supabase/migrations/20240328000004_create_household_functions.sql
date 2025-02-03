-- Drop existing function if it exists
drop function if exists public.create_household_with_defaults;
drop function if exists public.create_household;

-- Backup existing household data
create temp table households_backup as 
select * from public.households;

-- Drop and recreate the table to ensure clean state
drop table if exists public.households cascade;
create table if not exists public.households (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  invite_code text not null,
  created_by uuid references auth.users(id) not null,
  unique(invite_code, created_by)
);

-- Restore the backed up data
insert into public.households 
select * from households_backup;

-- Clean up temp table
drop table households_backup;

-- Enable RLS
alter table public.households enable row level security;

-- Create policies
create policy "Users can view their own households"
  on public.households
  for select
  using (auth.uid() = created_by);

create policy "Users can create households"
  on public.households
  for insert
  with check (auth.uid() = created_by);

-- Create function to create a household
create or replace function public.create_household(
  p_name text,
  p_invite_code text
) returns public.households as $$
declare
  v_household public.households;
begin
  -- Simple insert with all required fields
  insert into public.households (name, invite_code, created_by)
  values (p_name, p_invite_code, auth.uid())
  returning * into v_household;

  return v_household;
end;
$$ language plpgsql security definer; 