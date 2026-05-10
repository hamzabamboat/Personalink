create table post_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  file_name text,
  file_size integer,
  mime_type text,
  ai_description text,
  ai_mood text,
  ai_topics text[],
  ai_text_detected text,
  ai_post_hooks text[],
  ai_content_pillars text[],
  analysed_at timestamptz,
  uploaded_at timestamptz default now(),
  used_in_post_ids uuid[]
);

create index post_images_user_id_idx on post_images(user_id);

alter table post_images enable row level security;

create policy "Users can only access their own images"
on post_images for all
using (auth.uid() = user_id);

alter table posts add column if not exists image_urls text[];
