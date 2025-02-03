-- First, drop all existing policies
drop policy if exists "Enable read access for household members" on households;
drop policy if exists "Enable insert for authenticated users" on households;
drop policy if exists "Enable update for household members" on households;
drop policy if exists "Enable delete for household members" on households;

drop policy if exists "Enable read access for household members" on household_members;
drop policy if exists "Enable insert for authenticated users" on household_members;
drop policy if exists "Enable update for own profile" on household_members;
drop policy if exists "Enable delete for own profile" on household_members;

-- Enable RLS
alter table households enable row level security;
alter table household_members enable row level security;

-- Simple policies for households table
create policy "Enable read access for household members"
on households for select
using (
  auth.role() = 'authenticated' and
  exists (
    select 1
    from household_members
    where household_members.household_id = id
    and household_members.user_id = auth.uid()
  )
);

create policy "Enable insert for authenticated users"
on households for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for household members"
on households for update
using (
  auth.role() = 'authenticated' and
  exists (
    select 1
    from household_members
    where household_members.household_id = id
    and household_members.user_id = auth.uid()
  )
);

create policy "Enable delete for household members"
on households for delete
using (
  auth.role() = 'authenticated' and
  exists (
    select 1
    from household_members
    where household_members.household_id = id
    and household_members.user_id = auth.uid()
  )
);

-- Simple policies for household_members table
create policy "Enable read access for household members"
on household_members for select
using (
  auth.role() = 'authenticated' and
  (
    user_id = auth.uid() or
    household_id in (
      select h.id
      from households h
      inner join household_members hm on h.id = hm.household_id
      where hm.user_id = auth.uid()
    )
  )
);

create policy "Enable insert for authenticated users"
on household_members for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for own profile"
on household_members for update
using (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "Enable delete for own profile"
on household_members for delete
using (auth.role() = 'authenticated' and user_id = auth.uid()); 