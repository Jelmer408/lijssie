-- Drop everything related to category_order to ensure a clean slate
drop trigger if exists update_category_order_timestamp on public.category_order;
drop function if exists update_category_order_timestamp();
drop policy if exists "Users can view their household's category order" on public.category_order;
drop policy if exists "Admins can update their household's category order" on public.category_order;
drop policy if exists "Admins can insert category order" on public.category_order;
drop policy if exists "Enable read access for users in the same household" on public.category_order;
drop policy if exists "Enable insert access for household creation" on public.category_order;
drop policy if exists "Enable update access for household members" on public.category_order;

-- Drop the table if it exists (this will also drop any constraints)
drop table if exists public.category_order cascade; 