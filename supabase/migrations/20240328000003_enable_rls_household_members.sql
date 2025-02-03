-- Enable RLS
alter table public.household_members enable row level security;

-- Drop ALL existing policies
drop policy if exists "Enable delete for household members" on public.household_members;
drop policy if exists "Enable insert for authenticated users" on public.household_members;
drop policy if exists "Enable select for authenticated users" on public.household_members;
drop policy if exists "Enable update for household members" on public.household_members;
drop policy if exists "household_members_delete_policy" on public.household_members;
drop policy if exists "household_members_insert_policy" on public.household_members;
drop policy if exists "household_members_select_policy" on public.household_members;
drop policy if exists "household_members_update_policy" on public.household_members;
drop policy if exists "Enable select for household members" on public.household_members;
drop policy if exists "Enable select for own memberships" on public.household_members;
drop policy if exists "Enable insert for own memberships" on public.household_members;
drop policy if exists "Enable update for own memberships" on public.household_members;
drop policy if exists "Enable delete for own memberships" on public.household_members;
drop policy if exists "Enable select for own profile" on public.household_members;
drop policy if exists "Enable insert for own profile" on public.household_members;
drop policy if exists "Enable update for own profile" on public.household_members;
drop policy if exists "Enable delete for own profile" on public.household_members;

-- Create new clean policies
-- SELECT: Users can see their own record and records from their household
create policy "Enable select for authenticated users"
  on public.household_members for select
  to authenticated
  using (
    user_id = auth.uid() 
    or 
    (
      household_id is not null 
      and 
      household_id = (
        select household_id 
        from public.household_members 
        where user_id = auth.uid()
        limit 1
      )
    )
  );

-- INSERT: Users can only insert their own records
create policy "Enable insert for authenticated users"
  on public.household_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: Users can update their own records
create policy "Enable update for household members"
  on public.household_members for update
  to authenticated
  using (user_id = auth.uid());

-- DELETE: Users can delete their own records
create policy "Enable delete for household members"
  on public.household_members for delete
  to authenticated
  using (user_id = auth.uid()); 