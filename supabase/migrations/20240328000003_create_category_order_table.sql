-- Drop everything related to category_order to ensure a clean slate
drop trigger if exists update_category_order_timestamp on public.category_order;
drop trigger if exists create_default_category_order on public.households;
drop function if exists update_category_order_timestamp();
drop function if exists create_default_category_order();
drop policy if exists "Users can view their household's category order" on public.category_order;
drop policy if exists "Admins can update their household's category order" on public.category_order;
drop policy if exists "Admins can insert category order" on public.category_order;
drop policy if exists "Enable read access for users in the same household" on public.category_order;
drop policy if exists "Enable insert access for household creation" on public.category_order;
drop policy if exists "Enable update access for household members" on public.category_order;

-- Drop the table if it exists (this will also drop any constraints)
drop table if exists public.category_order cascade;

-- Create the table with correct structure
create table public.category_order (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  "order" jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create function to handle updates
create or replace function update_category_order_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create function to handle default category order creation
create or replace function create_default_category_order()
returns trigger as $$
begin
  insert into public.category_order (household_id, "order")
  values (
    new.id,
    to_jsonb(array[
      'Zuivel',
      'Groenten',
      'Fruit',
      'Vlees',
      'Vis',
      'Granen',
      'Kruiden',
      'Aziatisch',
      'Snacks',
      'Dranken',
      'Beleg',
      'Huishoudartikelen',
      'Diepvries',
      'Conserven',
      'Sauzen',
      'Pasta',
      'Ontbijt',
      'Snoep',
      'Chips',
      'Bakkerij',
      'Eieren',
      'Overig'
    ])
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for timestamp updates
create trigger update_category_order_timestamp
  before update on public.category_order
  for each row
  execute function update_category_order_timestamp();

-- Create trigger for default category order
create trigger create_default_category_order
  after insert on public.households
  for each row
  execute function create_default_category_order();

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