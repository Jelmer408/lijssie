-- Query to view all constraints on the households table
select 
    tc.constraint_name, 
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    rc.update_rule,
    rc.delete_rule,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
left join information_schema.referential_constraints rc
    on tc.constraint_name = rc.constraint_name
    and tc.table_schema = rc.constraint_schema
left join information_schema.constraint_column_usage ccu
    on rc.unique_constraint_name = ccu.constraint_name
    and tc.table_schema = ccu.table_schema
where tc.table_name = 'households'
and tc.table_schema = 'public';

-- Query to view all indexes on the households table
select
    schemaname as schema_name,
    tablename as table_name,
    indexname as index_name,
    indexdef as index_definition
from pg_indexes
where tablename = 'households'
and schemaname = 'public'; 