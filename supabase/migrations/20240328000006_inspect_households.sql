-- Get table definition
select 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
from information_schema.columns
where table_schema = 'public'
and table_name = 'households'
order by ordinal_position;

-- Get all constraints
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

-- Get all indexes and their columns
SELECT
    i.schemaname as schema_name,
    i.tablename as table_name,
    i.indexname as index_name,
    i.indexdef as index_definition,
    array_agg(a.attname ORDER BY c.ordinality) as columns
FROM pg_indexes i
LEFT JOIN LATERAL unnest(string_to_array(
    regexp_replace(
        regexp_replace(i.indexdef, '^.*\(', ''),
        '\).*$', ''
    ),
    ','
)) WITH ORDINALITY AS c(col_ref, ordinality) ON true
LEFT JOIN pg_attribute a ON a.attname = TRIM(c.col_ref)
    AND a.attrelid = i.tablename::regclass
WHERE i.tablename = 'households'
AND i.schemaname = 'public'
GROUP BY i.schemaname, i.tablename, i.indexname, i.indexdef;

-- Get triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'households';

-- Get foreign key relationships
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='households'
AND tc.table_schema='public';

-- Get RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'households'; 