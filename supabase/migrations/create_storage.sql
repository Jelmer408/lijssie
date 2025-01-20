-- Create a new storage bucket for recipe images
insert into storage.buckets (id, name)
values ('recipes', 'recipes')
on conflict (id) do nothing;

-- Set up storage policies for the recipes bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'recipes' );

create policy "Authenticated users can upload recipe images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipes'
  and (storage.foldername(name))[1] = 'recipe-images'
);

create policy "Authenticated users can update their recipe images"
on storage.objects for update
to authenticated
using ( bucket_id = 'recipes' );

create policy "Authenticated users can delete their recipe images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'recipes' ); 