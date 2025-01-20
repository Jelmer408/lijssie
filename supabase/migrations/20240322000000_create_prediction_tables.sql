-- Create prediction patterns table
create table if not exists public.prediction_patterns (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade,
  normalized_name text not null,
  original_names jsonb,
  category text not null,
  frequency interval,
  last_purchased timestamp with time zone,
  purchase_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create prediction preferences table
create table if not exists public.prediction_preferences (
  household_id uuid references households(id) on delete cascade primary key,
  max_suggestions integer default 5,
  enable_notifications boolean default true,
  notification_day text,
  notification_time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index if not exists prediction_patterns_household_id_idx on prediction_patterns(household_id);
create index if not exists prediction_patterns_normalized_name_idx on prediction_patterns(normalized_name);

-- Enable RLS
alter table prediction_patterns enable row level security;
alter table prediction_preferences enable row level security;

-- RLS Policies for prediction_patterns
create policy "Users can view prediction patterns from their household"
  on prediction_patterns for select
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert prediction patterns for their household"
  on prediction_patterns for insert
  with check (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can update prediction patterns from their household"
  on prediction_patterns for update
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete prediction patterns from their household"
  on prediction_patterns for delete
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

-- RLS Policies for prediction_preferences
create policy "Users can view prediction preferences from their household"
  on prediction_preferences for select
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert prediction preferences for their household"
  on prediction_preferences for insert
  with check (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can update prediction preferences from their household"
  on prediction_preferences for update
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete prediction preferences from their household"
  on prediction_preferences for delete
  using (
    household_id in (
      select household_id 
      from household_members 
      where user_id = auth.uid()
    )
  );

-- Grant necessary permissions
grant usage on schema public to authenticated;
grant all on public.prediction_patterns to authenticated;
grant all on public.prediction_preferences to authenticated; 