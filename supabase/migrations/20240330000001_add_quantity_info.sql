-- Add quantity_info column to products table
alter table if exists public.products 
add column if not exists quantity_info text;

-- Add index for faster quantity lookups
create index if not exists idx_products_quantity_info on products(quantity_info); 