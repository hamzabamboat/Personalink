CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  linkedin_id text not null,
  linkedin_name text,
  linkedin_picture text,
  linkedin_access_token text,
  linkedin_token_expires_at timestamptz,
  is_active boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text default 'linkedin';
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS content_pillars text;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_pillars text;
