-- Create the net schema if it doesn't exist
create schema if not exists net;

-- Create the http_post function with proper implementation
create or replace function net.http_post(
  url text,
  headers jsonb default '{}',
  body text default ''
) returns text
language plpgsql
security definer
as $$
declare
  response text;
begin
  select content::text into response
  from http((
    'POST',
    url,
    headers,
    'application/json',
    body
  )::http_request);
  return response;
exception
  when others then
    return '';
end;
$$;

-- Enable the http extension if not already enabled
create extension if not exists http with schema extensions;

-- Create push_tokens table
create table if not exists public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id),
  token text not null,
  device_type text,
  updated_at timestamp with time zone
);

-- Create grocery_items table
create table if not exists public.grocery_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  quantity integer default 1,
  category text,
  priority boolean default false,
  completed boolean default false,
  emoji text,
  user_id uuid references auth.users(id),
  user_name text,
  user_avatar text
);

-- Drop all existing policies first
drop policy if exists "Enable read access for authenticated users" on public.grocery_items;
drop policy if exists "Enable insert access for authenticated users" on public.grocery_items;
drop policy if exists "Enable update access for authenticated users" on public.grocery_items;
drop policy if exists "Enable delete access for authenticated users" on public.grocery_items;
drop policy if exists "Enable all access for authenticated users" on public.grocery_items;

-- Disable RLS temporarily
alter table public.grocery_items disable row level security;

-- Re-enable RLS
alter table public.grocery_items enable row level security;

-- Create new simplified policies
create policy "Enable read access for all users"
on public.grocery_items for select
using (true);

create policy "Enable insert for authenticated users"
on public.grocery_items for insert
to authenticated
with check (auth.uid() IS NOT NULL);

create policy "Enable update for authenticated users"
on public.grocery_items for update
to authenticated
using (auth.uid() IS NOT NULL);

create policy "Enable delete for authenticated users"
on public.grocery_items for delete
to authenticated
using (auth.uid() IS NOT NULL);

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.grocery_items to authenticated, anon;

-- Create policies for push_tokens
create policy "Enable read access for authenticated users" on public.push_tokens
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on public.push_tokens
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on public.push_tokens
  for update using (auth.role() = 'authenticated');

create policy "Enable delete access for authenticated users" on public.push_tokens
  for delete using (auth.role() = 'authenticated');

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.push_tokens to authenticated;
grant usage on schema net to authenticated;
grant execute on function net.http_post(text, jsonb, text) to authenticated;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

-- Add meal_proposals table
create table if not exists public.meal_proposals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  emoji text,
  image_url text,
  votes uuid[] default '{}',
  created_by uuid references auth.users(id),
  date text not null,
  recipe jsonb,
  is_recipe boolean default false
);

-- Add day_schedule table
create table if not exists public.day_schedule (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id),
  date text not null,
  is_present boolean default false
);

-- Create policies for meal_proposals
create policy "Enable read access for all users"
  on public.meal_proposals for select
  using (true);

create policy "Enable insert for authenticated users"
  on public.meal_proposals for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Enable update for authenticated users"
  on public.meal_proposals for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Enable delete for authenticated users"
  on public.meal_proposals for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "Enable update votes for authenticated users"
  on public.meal_proposals for update
  to authenticated
  using (true)
  with check (
    -- Only allow updating the votes array
    (old.votes IS DISTINCT FROM new.votes AND 
     old.name = new.name AND 
     old.description = new.description AND 
     old.emoji = new.emoji AND 
     old.image_url = new.image_url AND 
     old.created_by = new.created_by AND 
     old.date = new.date)
    OR 
    -- Or allow full updates if you're the creator
    auth.uid() = created_by
  );

-- Create policies for day_schedule
create policy "Enable read access for all users"
  on public.day_schedule for select
  using (true);

create policy "Enable insert for authenticated users"
  on public.day_schedule for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Enable update for authenticated users"
  on public.day_schedule for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Enable delete for authenticated users"
  on public.day_schedule for delete
  to authenticated
  using (auth.uid() = user_id);

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.meal_proposals to authenticated, anon;
grant all on public.day_schedule to authenticated, anon; 