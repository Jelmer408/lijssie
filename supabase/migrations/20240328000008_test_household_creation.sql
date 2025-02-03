-- Create a test table for households
create table if not exists public.households_test (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  invite_code text not null,
  created_by uuid references auth.users(id) not null,
  unique(invite_code, created_by)
);

-- Enable RLS
alter table public.households_test enable row level security;

-- Create policies
create policy "Users can view their own households"
  on public.households_test
  for select
  using (auth.uid() = created_by);

create policy "Users can create households"
  on public.households_test
  for insert
  with check (auth.uid() = created_by);

-- Create test function
create or replace function public.create_test_household(
  p_name text,
  p_invite_code text
) returns public.households_test as $$
declare
  v_household public.households_test;
begin
  insert into public.households_test (name, invite_code, created_by)
  values (p_name, p_invite_code, auth.uid())
  returning * into v_household;

  return v_household;
end;
$$ language plpgsql security definer; 