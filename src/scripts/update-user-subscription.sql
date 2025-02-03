-- Update user subscription status to premium
UPDATE auth.users
SET subscription_status = 'premium'
WHERE id = '818241c5-63b2-41de-9a46-8291bb23296d';

-- Verify the update
SELECT id, subscription_status 
FROM auth.users 
WHERE id = '818241c5-63b2-41de-9a46-8291bb23296d'; 