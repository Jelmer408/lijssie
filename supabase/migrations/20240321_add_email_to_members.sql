-- Add email column to household_members
alter table public.household_members 
add column if not exists email text;

-- Make email not null after adding it
alter table public.household_members 
alter column email set not null; 