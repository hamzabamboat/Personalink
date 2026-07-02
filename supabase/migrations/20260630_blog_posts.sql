-- Auto-generated SEO blog posts, written weekly by /api/cron/seo-blog and rendered
-- by app/blog/[slug]/page.tsx. Kept separate from the hand-built static TSX posts
-- declared in lib/blog-posts.ts.
DROP TABLE IF EXISTS blog_posts CASCADE;
CREATE TABLE blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text DEFAULT '',
  body_markdown text NOT NULL,
  tags text[] DEFAULT '{}',
  read_time text DEFAULT '5 min read',
  published boolean DEFAULT true,
  source text DEFAULT 'auto',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_blog_posts_created ON blog_posts(created_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public/anon may read only published rows. All writes happen through the
-- service-role key (which bypasses RLS), so no insert/update policy is needed.
DROP POLICY IF EXISTS "blog_posts public read published" ON blog_posts;
CREATE POLICY "blog_posts public read published" ON blog_posts
  FOR SELECT USING (published = true);
