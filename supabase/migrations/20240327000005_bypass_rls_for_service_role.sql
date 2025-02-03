-- Create a function to create a household with service role privileges
create or replace function create_household_with_defaults(
  p_name text,
  p_invite_code text,
  p_user_id uuid,
  p_user_email text,
  p_user_name text
)
returns json
language plpgsql
security definer -- This makes the function run with the privileges of the creator
set search_path = public
as $$
declare
  v_household_id uuid;
  v_result json;
begin
  -- Create the household
  insert into households (name, invite_code, created_by)
  values (p_name, p_invite_code, p_user_id)
  returning id into v_household_id;

  -- Create the household member entry
  insert into household_members (
    household_id,
    user_id,
    role,
    email,
    user_name
  ) values (
    v_household_id,
    p_user_id,
    'admin',
    p_user_email,
    p_user_name
  );

  -- Create default category order
  insert into category_order (household_id, "order", updated_at)
  values (
    v_household_id,
    array['Zuivel', 'Groenten', 'Fruit', 'Vlees', 'Vis', 'Brood', 'Drinken', 'Snacks', 'Pasta', 'Sauzen', 'Conserven', 'Diepvries', 'Ontbijt', 'Bakkerij', 'Huishouden', 'Persoonlijk', 'Overig'],
    now()
  );

  -- Get the created household data
  select json_build_object(
    'id', h.id,
    'name', h.name,
    'invite_code', h.invite_code,
    'created_at', h.created_at,
    'created_by', h.created_by
  ) into v_result
  from households h
  where h.id = v_household_id;

  return v_result;
end;
$$; 