-- Add user_avatar column to household_members
alter table public.household_members 
add column if not exists user_avatar text;

-- Update existing members with avatar URLs from auth.users
update public.household_members hm
set user_avatar = coalesce(
  au.raw_user_meta_data->>'picture',  -- Google OAuth picture URL
  au.raw_user_meta_data->'user_metadata'->>'avatar_url', -- Google's default one-letter avatar
  au.raw_user_meta_data->>'avatar_url', -- Fallback to avatar_url if picture doesn't exist
  'https://ui-avatars.com/api/?name=' || replace(hm.user_name, ' ', '+') || '&background=random' -- Generate avatar if no URL exists
)
from auth.users au
where hm.user_id = au.id;

-- Create a function to update user_avatar when user metadata changes
create or replace function update_member_avatar()
returns trigger as $$
begin
  update public.household_members
  set user_avatar = coalesce(
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->'user_metadata'->>'avatar_url', -- Google's default one-letter avatar
    NEW.raw_user_meta_data->>'avatar_url',
    'https://ui-avatars.com/api/?name=' || replace(user_name, ' ', '+') || '&background=random'
  )
  where user_id = NEW.id;
  return NEW;
end;
$$ language plpgsql security definer;

-- Create a trigger to automatically update avatar when user metadata changes
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row
  execute function update_member_avatar(); 