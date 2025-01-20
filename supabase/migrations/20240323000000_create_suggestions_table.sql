-- Create suggestions table
create table if not exists public.suggestions (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade,
  name text not null,
  category text not null,
  quantity text not null,
  emoji text,
  explanation text not null,
  confidence numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries
create index if not exists suggestions_household_id_idx on suggestions(household_id);
create index if not exists suggestions_created_at_idx on suggestions(created_at);

-- Enable RLS
alter table suggestions enable row level security;

-- RLS Policies
create policy "Users can view suggestions from their household"
  on suggestions for select
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert suggestions for their household"
  on suggestions for insert
  with check (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can update suggestions from their household"
  on suggestions for update
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete suggestions from their household"
  on suggestions for delete
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

-- Grant necessary permissions
grant all on public.suggestions to authenticated; 