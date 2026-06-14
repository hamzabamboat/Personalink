-- ──────────────────────────────────────────────────────────────────────
-- Viral / inspiration library — Phase 1 (legit, no scraping)
--
-- Three sources, none of which republish third-party post text + identity:
--   • curated      — human-written transformative pattern breakdowns (seed below)
--   • first_party  — top posts published THROUGH PersonaLink, opted-in + anonymized
--   • community    — user swipe-file saves (opt-in public later)
--
-- Public SEO surface + remix are layered on later; Phase 1 is in-app only.
-- Additive + idempotent.
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_items (
  id uuid default gen_random_uuid() primary key,
  source text not null default 'curated',          -- 'curated' | 'first_party' | 'community'
  slug text unique,                                 -- stable key (curated seed idempotency)
  title text,
  niche text,                                       -- 'founders' | 'b2b-saas' | 'careers' | ...
  format text,                                      -- 'text' | 'list' | 'story'
  hook_type text,                                   -- 'contrarian' | 'vulnerable' | 'data' | ...
  pattern_summary text,                             -- transformative "why it works"
  template_text text,                               -- reusable fill-in-the-blank template
  engagement_tier text default 'top',               -- 'high' | 'top'
  contributed_by uuid references users(id) on delete set null,
  attributed boolean default false,
  is_public boolean default true,
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS library_items_browse_idx ON library_items(is_public, source, created_at);

CREATE TABLE IF NOT EXISTS swipe_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  library_item_id uuid references library_items(id) on delete cascade,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, library_item_id)
);
CREATE INDEX IF NOT EXISTS swipe_saves_user_idx ON swipe_saves(user_id, created_at);

-- Opt-in: contribute my top-performing posts (anonymized) to the library.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS contribute_to_library boolean default false;

-- ── Curated seed: original pattern breakdowns (no third-party verbatim text) ──
-- Dollar-quoted to avoid apostrophe escaping; ON CONFLICT keeps it idempotent.
INSERT INTO library_items (source, slug, title, niche, format, hook_type, pattern_summary, template_text, engagement_tier) VALUES
('curated','contrarian-take',$$The contrarian take$$,$$general$$,$$text$$,$$contrarian$$,
 $$Opens by naming the crowd's belief, then flips it. The tension ("everyone thinks X, but…") earns the next line. Works because it promises a non-obvious payoff and signals independent thinking.$$,
 $$Everyone tells you to [common advice].

I did the opposite. Here's what happened:

[1–2 lines on the result]

The truth most people miss: [your reframed insight].

If you're [audience], try [specific alternative] instead.$$,'top'),

('curated','vulnerable-failure',$$The vulnerable failure story$$,$$founders$$,$$story$$,$$vulnerable$$,
 $$Leads with a moment of real stakes, then mines it for a lesson. Vulnerability buys attention; the lesson earns the reshare. The "I've never told anyone this" beat raises perceived honesty.$$,
 $$We almost [near-disaster] last [time].

[One concrete, specific detail that makes it real.]

I've never talked about this publicly. But here's what it taught me:

[The lesson, stated as a principle — not a humblebrag.]

[One line of advice for someone facing the same thing.]$$,'top'),

('curated','numbered-lessons',$$Numbered lessons$$,$$general$$,$$list$$,$$listicle$$,
 $$A counted promise ("5 lessons") sets a clear scope the reader can finish. Each item is a one-line claim + a sentence of proof. Scannable, saveable, and easy to skim on mobile.$$,
 $$[N] things [time period / experience] taught me:

1. [Claim]. [One line of proof.]
2. [Claim]. [One line of proof.]
3. [Claim]. [One line of proof.]

The one I wish I'd learned first: #[x].$$,'top'),

('curated','before-after',$$The before / after$$,$$careers$$,$$story$$,$$transformation$$,
 $$Anchors two points in time to make change legible. The gap does the persuading. Strong for credibility because it shows, not tells, and invites "how did you do it?" in the comments.$$,
 $$[Time] ago: [honest starting point].

Today: [current state].

Here's what actually moved the needle (it wasn't [obvious guess]):

[2–3 specific actions.]

If you're where I was: [encouragement + one first step].$$,'high'),

('curated','myth-vs-reality',$$Myth vs reality$$,$$b2b-saas$$,$$text$$,$$myth-buster$$,
 $$Pairs a widely-repeated myth with a sharper reality. The format creates instant contrast and positions you as the person who knows better. Reframes a category the reader already cares about.$$,
 $$Myth: [the thing everyone repeats].

Reality: [what's actually true].

Most [audience] optimise for [myth] and wonder why [bad outcome].

The teams that win do [reality] instead — here's what that looks like: [1–2 lines].$$,'top'),

('curated','data-hook',$$The data hook$$,$$marketing$$,$$text$$,$$data$$,
 $$Opens with a sharp, specific number that breaks a pattern. Numbers feel objective and stop the scroll. The follow-through must explain the "so what" or the stat falls flat.$$,
 $$[X]% of [group] do [thing].

The other [Y]% do this instead — and it's why they [better outcome]:

[The non-obvious behaviour, in 2–3 lines.]

Steal it: [one concrete action the reader can take today].$$,'high'),

('curated','unpopular-opinion',$$Unpopular opinion$$,$$general$$,$$text$$,$$hot-take$$,
 $$Signals risk ("unpopular opinion") which raises curiosity and invites debate — comments lift reach. Best when the take is genuinely defensible, not just edgy. Back it with one reason.$$,
 $$Unpopular opinion: [your take].

I know that's not what you're supposed to say.

But after [experience/credibility], I'm convinced: [one-line argument].

[Optional: the nuance / who this doesn't apply to.]

Agree or disagree?$$,'high'),

('curated','behind-the-scenes',$$Behind the scenes$$,$$founders$$,$$story$$,$$behind-the-scenes$$,
 $$Trades polish for access. "What I don't usually share" rewards the reader with insider detail and builds parasocial trust. Strong for founders building in public.$$,
 $$What I don't usually share:

[The unglamorous reality behind a visible win.]

Everyone sees [the highlight]. Almost no one sees [the messy middle].

[The honest takeaway — what it actually took.]$$,'high'),

('curated','framework-howto',$$The framework$$,$$operators$$,$$list$$,$$how-to$$,
 $$Packages experience into a named, repeatable system. Naming the framework makes it memorable and quotable. Readers save how-tos they intend to use, which boosts the algorithm's "dwell" signal.$$,
 $$The [name] framework I use for [outcome]:

1. [Step] — [one line on why].
2. [Step] — [one line on why].
3. [Step] — [one line on why].

Run it the next time you [situation]. Save this so you don't forget step 2.$$,'top'),

('curated','mistake-confession',$$The expensive mistake$$,$$founders$$,$$story$$,$$confession$$,
 $$Quantifies a mistake (time, money, opportunity) so the lesson lands with weight. Confessions disarm and the specific cost makes the advice feel earned rather than theoretical.$$,
 $$I wasted [time / money / opportunity] doing [the wrong thing].

Here's what I'd do differently — so you don't pay the same price:

[2–3 specific, actionable corrections.]

The real lesson: [the principle underneath the mistake].$$,'high')
ON CONFLICT (slug) DO NOTHING;
