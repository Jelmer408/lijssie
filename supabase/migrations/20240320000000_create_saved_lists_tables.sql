-- Create saved lists tables
create table if not exists saved_lists (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    household_id uuid references households(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists saved_list_items (
    id uuid default uuid_generate_v4() primary key,
    list_id uuid references saved_lists(id) on delete cascade,
    name text not null,
    category text not null,
    quantity text,
    emoji text,
    priority boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index if not exists saved_lists_household_id_idx on saved_lists(household_id);
create index if not exists saved_lists_user_id_idx on saved_lists(user_id);
create index if not exists saved_list_items_list_id_idx on saved_list_items(list_id);

-- Set up RLS (Row Level Security) policies
alter table saved_lists enable row level security;
alter table saved_list_items enable row level security;

-- Policy: Users can only access lists from their household
create policy "Users can view saved lists from their household"
    on saved_lists for select
    using (
        household_id in (
            select household_id 
            from household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can insert saved lists for their household"
    on saved_lists for insert
    with check (
        household_id in (
            select household_id 
            from household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can update saved lists from their household"
    on saved_lists for update
    using (
        household_id in (
            select household_id 
            from household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can delete saved lists from their household"
    on saved_lists for delete
    using (
        household_id in (
            select household_id 
            from household_members 
            where user_id = auth.uid()
        )
    );

-- Policies for saved_list_items
create policy "Users can view saved list items from their household's lists"
    on saved_list_items for select
    using (
        list_id in (
            select id 
            from saved_lists 
            where household_id in (
                select household_id 
                from household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can insert items into their household's lists"
    on saved_list_items for insert
    with check (
        list_id in (
            select id 
            from saved_lists 
            where household_id in (
                select household_id 
                from household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can update items in their household's lists"
    on saved_list_items for update
    using (
        list_id in (
            select id 
            from saved_lists 
            where household_id in (
                select household_id 
                from household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can delete items from their household's lists"
    on saved_list_items for delete
    using (
        list_id in (
            select id 
            from saved_lists 
            where household_id in (
                select household_id 
                from household_members 
                where user_id = auth.uid()
            )
        )
    );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_saved_lists_updated_at
    before update on saved_lists
    for each row
    execute function update_updated_at_column(); 