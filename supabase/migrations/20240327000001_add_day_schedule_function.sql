-- Create a function to get day schedule for a household that bypasses RLS
create or replace function get_day_schedule_for_household(p_household_id uuid)
returns table (
  id uuid,
  user_id uuid,
  is_present boolean,
  date text,
  created_at timestamptz,
  user_name text,
  user_avatar text
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select 
    ds.id,
    ds.user_id,
    ds.is_present,
    ds.date,
    ds.created_at,
    hm.user_name,
    hm.user_avatar
  from day_schedule ds
  join household_members hm on ds.user_id = hm.user_id
  where hm.household_id = p_household_id;
end;
$$; 