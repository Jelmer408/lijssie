-- Check the current column type
SELECT 
  a.attname as column_name,
  format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_attribute a
JOIN pg_class t ON a.attrelid = t.oid
JOIN pg_namespace s ON t.relnamespace = s.oid
WHERE a.attnum > 0 
  AND NOT a.attisdropped
  AND t.relname = 'supermarket_offers'
  AND s.nspname = 'public'
  AND a.attname = 'embedding'; 