-- Create recipe generations table
create table if not exists recipe_generations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add index for faster queries
create index recipe_generations_user_id_created_at_idx 
on recipe_generations(user_id, created_at);

-- Add RLS policies
alter table recipe_generations enable row level security;

create policy "Users can view their own recipe generations"
on recipe_generations for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own recipe generations"
on recipe_generations for insert
to authenticated
with check (auth.uid() = user_id); 