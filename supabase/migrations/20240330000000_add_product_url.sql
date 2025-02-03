-- Add URL column to products table
alter table if exists public.products 
add column if not exists url text;

-- Add index for faster URL lookups
create index if not exists idx_products_url on products(url); 