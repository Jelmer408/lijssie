-- First drop existing policies and triggers
drop policy if exists "Users can view their household's category order" on public.category_order;
drop policy if exists "Admins can update their household's category order" on public.category_order;
drop policy if exists "Admins can insert category order" on public.category_order;
drop trigger if exists ensure_unique_household_order on public.category_order;

-- Drop the existing table
drop table if exists public.category_order;

-- Recreate the table with correct structure
create table public.category_order (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  "order" jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_household_order unique (household_id)
);

-- Create function to handle updates
create or replace function update_category_order_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for timestamp updates
create trigger update_category_order_timestamp
  before update on public.category_order
  for each row
  execute function update_category_order_timestamp();

-- Enable RLS
alter table public.category_order enable row level security;

-- Create policies
create policy "Enable read access for users in the same household"
  on public.category_order for select
  to authenticated
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  );

create policy "Enable insert access for household creation"
  on public.category_order for insert
  to authenticated
  with check (
    household_id in (
      select id 
      from public.households 
      where created_by = auth.uid()
    )
  );

create policy "Enable update access for household members"
  on public.category_order for update
  to authenticated
  using (
    household_id in (
      select household_id 
      from public.household_members 
      where user_id = auth.uid()
    )
  ); 