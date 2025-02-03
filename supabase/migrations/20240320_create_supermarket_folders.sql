-- Create the supermarket_folders table
create table if not exists supermarket_folders (
  id uuid primary key default uuid_generate_v4(),
  supermarket text not null check (supermarket in ('ah', 'jumbo', 'dirk')),
  url text not null,
  title text not null,
  valid_from timestamp with time zone not null,
  valid_until timestamp with time zone not null,
  pdf_url text not null,
  local_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster queries
create index if not exists supermarket_folders_supermarket_idx on supermarket_folders(supermarket);
create index if not exists supermarket_folders_valid_from_idx on supermarket_folders(valid_from);
create index if not exists supermarket_folders_valid_until_idx on supermarket_folders(valid_until);

-- Enable RLS
alter table supermarket_folders enable row level security;

-- Create policies
create policy "Enable read access for all users"
  on supermarket_folders for select
  using (true);

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on supermarket_folders to authenticated; 