-- Create category_order table
create table if not exists public.category_order (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households(id) on delete cascade not null unique,
  "order" jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.category_order enable row level security;

-- Allow users to see category orders for their household
create policy "Users can view their household's category order"
  on public.category_order for select
  to authenticated
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

-- Allow users to update their household's category order if they are admin
create policy "Admins can update their household's category order"
  on public.category_order for update
  to authenticated
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid() 
      and role = 'admin'
    )
  );

-- Allow admins to insert category order for their household
create policy "Admins can insert category order"
  on public.category_order for insert
  to authenticated
  with check (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid() 
      and role = 'admin'
    )
  ); 