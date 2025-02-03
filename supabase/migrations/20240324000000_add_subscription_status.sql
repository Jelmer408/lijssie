-- Add subscription_status column to auth.users
alter table auth.users 
add column if not exists subscription_status text 
default 'free' 
check (subscription_status in ('free', 'premium'));

-- Add comment to explain the column
comment on column auth.users.subscription_status is 'User subscription status (free or premium)';

-- Update existing users to have 'free' status if null
update auth.users 
set subscription_status = 'free' 
where subscription_status is null; 