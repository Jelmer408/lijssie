-- Check if the households table has the correct structure
do $$
begin
  -- Check if all required columns exist
  if not exists (
    select 1
    from information_schema.columns
    where table_name = 'households'
    and column_name = 'created_by'
  ) then
    raise exception 'households table is missing the created_by column';
  end if;

  -- Verify the reference to auth.users
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'households'
    and constraint_type = 'FOREIGN KEY'
    and constraint_name like '%created_by%'
  ) then
    raise exception 'households table is missing the foreign key constraint on created_by';
  end if;
end$$; 