-- Drop existing table and recreate with correct ID type
drop table if exists public.products cascade;

create table if not exists public.products (
    id text primary key,
    title text not null,
    quantity_info text,
    last_updated text,
    image_url text,
    category text,
    subcategory text,
    main_category text,
    supermarket_data jsonb,
    url text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes for better query performance
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_subcategory on products(subcategory);
create index if not exists idx_products_main_category on products(main_category);
create index if not exists idx_products_created_at on products(created_at);
create index if not exists idx_products_updated_at on products(updated_at);
create index if not exists idx_products_url on products(url);
create index if not exists idx_products_quantity_info on products(quantity_info);

-- Create a GIN index for efficient JSON querying
create index if not exists idx_products_supermarket_data on products using gin (supermarket_data);

-- Enable RLS
alter table public.products enable row level security;

-- Allow anonymous read access
create policy "Allow anonymous read access"
on public.products for select
using (true);

-- Allow service role full access
create policy "Allow service role full access"
on public.products for all
using (true)
with check (true);

-- Grant necessary permissions
grant usage on schema public to service_role;
grant all privileges on public.products to service_role; 