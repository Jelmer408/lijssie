-- Drop existing functions if they exist
drop function if exists get_household_member(text);
drop function if exists check_household_membership(uuid);

-- Create a comprehensive function to check household membership
create or replace function check_user_household(p_user_id uuid)
returns table (
  has_household boolean,
  household_id uuid,
  household_name text,
  user_id uuid,
  email text,
  user_name text,
  user_avatar text
)
security definer
set search_path = public
language plpgsql
as $$
declare
  v_member_exists boolean;
begin
  -- First clean up any stale or invalid memberships
  delete from household_members hm
  where hm.user_id = p_user_id
  and not exists (
    select 1 
    from households h 
    where h.id = hm.household_id
  );

  -- Then check if the user is a member of any household
  select exists(
    select 1 
    from household_members hm
    where hm.user_id = p_user_id
  ) into v_member_exists;

  -- If user is not a member, return false for has_household
  if not v_member_exists then
    return query
    select 
      false as has_household,
      null::uuid as household_id,
      null::text as household_name,
      p_user_id as user_id,
      null::text as email,
      null::text as user_name,
      null::text as user_avatar;
    return;
  end if;

  -- If user is a member, return the full household details
  return query
  select 
    true as has_household,
    h.id as household_id,
    h.name as household_name,
    hm.user_id,
    hm.email,
    hm.user_name,
    hm.user_avatar
  from household_members hm
  join households h on h.id = hm.household_id
  where hm.user_id = p_user_id;
end;
$$; 