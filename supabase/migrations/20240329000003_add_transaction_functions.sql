-- Function to begin a transaction
create or replace function begin_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Start a new transaction
  perform set_config('transaction_level', '1', true);
end;
$$;

-- Function to commit a transaction
create or replace function commit_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Commit the current transaction
  perform set_config('transaction_level', '0', true);
end;
$$;

-- Function to rollback a transaction
create or replace function rollback_transaction()
returns void
language plpgsql
security definer
as $$
begin
  -- Rollback the current transaction
  perform set_config('transaction_level', '0', true);
  raise exception 'Transaction rolled back';
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function begin_transaction to authenticated;
grant execute on function commit_transaction to authenticated;
grant execute on function rollback_transaction to authenticated; 