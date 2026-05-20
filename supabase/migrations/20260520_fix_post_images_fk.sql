-- Fix post_images user_id FK: was referencing auth.users (Supabase Auth),
-- but this app uses a custom users table with its own UUIDs.
alter table post_images
  drop constraint post_images_user_id_fkey;

alter table post_images
  add constraint post_images_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;
