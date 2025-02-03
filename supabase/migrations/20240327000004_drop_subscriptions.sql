-- Drop all subscriptions
DO $$ 
DECLARE
    subscription_name text;
BEGIN
    FOR subscription_name IN (SELECT subname FROM pg_subscription)
    LOOP
        EXECUTE format('DROP SUBSCRIPTION IF EXISTS %I', subscription_name);
    END LOOP;
END $$;

-- Drop all replication slots
DO $$ 
DECLARE
    slot_name text;
BEGIN
    FOR slot_name IN (SELECT slot_name FROM pg_replication_slots)
    LOOP
        PERFORM pg_drop_replication_slot(slot_name);
    END LOOP;
END $$; 