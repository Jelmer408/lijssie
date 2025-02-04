-- Create stored procedure for updating products
create or replace function public.update_product(
  p_id text,
  p_title text,
  p_image_url text,
  p_quantity_info text,
  p_category text,
  p_subcategory text,
  p_main_category text,
  p_supermarket_data jsonb,
  p_last_updated text,
  p_url text
) returns void as $$
begin
  update public.products
  set
    title = p_title,
    image_url = p_image_url,
    quantity_info = p_quantity_info,
    category = p_category,
    subcategory = p_subcategory,
    main_category = p_main_category,
    supermarket_data = p_supermarket_data,
    last_updated = p_last_updated,
    url = p_url,
    updated_at = now()
  where id = p_id;
end;
$$ language plpgsql security definer;

-- Create stored procedure for inserting products
create or replace function public.insert_product(
  p_id text,
  p_title text,
  p_image_url text,
  p_quantity_info text,
  p_category text,
  p_subcategory text,
  p_main_category text,
  p_supermarket_data jsonb,
  p_last_updated text,
  p_url text
) returns void as $$
begin
  insert into public.products (
    id,
    title,
    image_url,
    quantity_info,
    category,
    subcategory,
    main_category,
    supermarket_data,
    last_updated,
    url,
    created_at,
    updated_at
  ) values (
    p_id,
    p_title,
    p_image_url,
    p_quantity_info,
    p_category,
    p_subcategory,
    p_main_category,
    p_supermarket_data,
    p_last_updated,
    p_url,
    now(),
    now()
  );
end;
$$ language plpgsql security definer; 