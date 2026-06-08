import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'

export const metadata: Metadata = {
  title: 'How to Grow on LinkedIn in India 2026: The Honest Guide [No Hype]',
  description:
    'How to grow on LinkedIn in India in 2026 — an honest, no-hype guide with real data, the post types that actually work, the Hinglish question, and a 90-day plan.',
  keywords: [
    'how to grow on linkedin india',
    'LinkedIn India',
    'LinkedIn growth',
    'Hinglish',
    'LinkedIn algorithm 2026',
    'personal branding India',
    'creator economy India',
  ],
  alternates: { canonical: 'https://personalink.in/blog/how-to-grow-linkedin-india-2026' },
  openGraph: {
    type: 'article',
    title: 'How to Grow on LinkedIn in India in 2026 (The Honest Guide)',
    description:
      'An honest, no-hype guide to LinkedIn growth in India — real data, the four post types that work, the Hinglish question, and a 90-day plan.',
    url: 'https://personalink.in/blog/how-to-grow-linkedin-india-2026',
    publishedTime: '2026-06-08',
  },
}

const linkSx = {
  color: 'var(--pl-accent)',
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
} as const

const DIAGRAM_BASE = '/blog/how-to-grow-linkedin-india-2026'

function Figure({ src, alt, caption, w, h }: { src: string; alt: string; caption: string; w: number; h: number }) {
  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        className="w-full h-auto rounded-xl border"
        style={{ borderColor: 'var(--line)', background: '#ffffff' }}
      />
      <figcaption
        className="text-center mt-2"
        style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.04em' }}
      >
        {caption}
      </figcaption>
    </figure>
  )
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How long does it take to grow on LinkedIn in India?',
    a: 'Plan for 8 to 12 weeks before steady movement. Reach usually stays flat for the first month or so while the algorithm gathers signal, then climbs once it has enough to trust the account. Anyone promising results in a week is selling something.',
  },
  {
    q: 'How many followers do I need to get clients or job offers on LinkedIn in India?',
    a: 'Fewer than most expect. Inbound tends to start at a few thousand of the right followers, not tens of thousands. A thousand people who do the work you serve are worth more than ten thousand strangers.',
  },
  {
    q: 'Is Hinglish unprofessional on LinkedIn?',
    a: 'No, if it is how you genuinely speak and the word is the precise one. It reads as more authentic to an Indian audience. It only looks unprofessional when it is added for relatability. Match the language mix to your reader.',
  },
  {
    q: 'How often should I post on LinkedIn?',
    a: 'Two to three times a week for most working professionals, three to four if growth is part of your job. Daily posting only makes sense if content is your full-time work. Past three or four posts a week the returns flatten while the effort keeps rising, which is why most daily posters quit.',
  },
  {
    q: 'Do hashtags still work on LinkedIn in 2026?',
    a: 'Use three to five specific hashtags. More than five can trigger spam filters and cut reach. Hashtags are minor compared with your first line.',
  },
  {
    q: 'What is the best time to post on LinkedIn in India?',
    a: 'Mornings on Tuesday to Thursday, roughly 8:00 to 10:00 am IST, tend to work best because professionals check the feed before the day starts. Consistency matters more than timing.',
  },
  {
    q: 'Will the LinkedIn algorithm penalise me for using AI to write posts?',
    a: 'LinkedIn does not penalise AI-assisted writing; it penalises low-quality, generic writing. The risk is publishing something that sounds like nobody. Drafting in your own voice and approving every post before it goes out avoids this.',
  },
  {
    q: 'Do engagement pods work on LinkedIn in 2026?',
    a: 'Not any more. The 2026 feed reads the substance of comment threads, so generic pod comments signal low quality and can hurt reach. Twenty minutes of genuine commenting a day is the version that still works.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'How to Grow on LinkedIn in India in 2026 (The Honest Guide)',
      alternativeHeadline: 'How to Grow on LinkedIn in India 2026: The Honest Guide [No Hype]',
      description:
        'How to grow on LinkedIn in India in 2026 — an honest, no-hype guide with real data, the post types that actually work, the Hinglish question, and a 90-day plan.',
      image: 'https://personalink.in/og-image.png',
      datePublished: '2026-06-08',
      dateModified: '2026-06-08',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' },
      publisher: {
        '@type': 'Organization',
        name: 'PersonaLink',
        url: 'https://personalink.in',
        logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://personalink.in/blog/how-to-grow-linkedin-india-2026',
      },
      articleSection: 'LinkedIn Growth',
      keywords:
        'how to grow on linkedin india, LinkedIn India, LinkedIn growth, Hinglish, LinkedIn algorithm 2026, personal branding India',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
}

const H2 = 'text-xl font-bold text-slate-900 mt-12 mb-4'
const H3 = 'text-base md:text-lg font-semibold text-slate-900 mt-8 mb-2'
const P = 'mb-5'
const UL = 'list-disc pl-6 mb-6 space-y-2 marker:text-slate-400'
const STRONG = 'font-semibold text-slate-900'

export default function Article() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav
        style={{
          background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 clamp(16px,4vw,32px)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <Link href="/blog" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>
            ← Blog
          </Link>
        </div>
      </nav>

      <article className="max-w-[720px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap gap-2 mb-6">
          {['LinkedIn India', 'Growth Strategy', 'Hinglish'].map(tag => (
            <span
              key={tag}
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10.5,
                letterSpacing: '.04em',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'var(--pl-accent-soft)',
                color: 'var(--pl-accent)',
                border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontSize: 'clamp(26px,4vw,38px)',
            fontWeight: 500,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: '0 0 12px',
          }}
        >
          How to grow on LinkedIn in India in 2026 (the honest guide)
        </h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.04em', marginBottom: 40 }}>
          June 2026 · 14 min read · by the PersonaLink Team
        </p>

        <div className="max-w-none text-slate-600 leading-[1.8]">
          <p className="text-lg text-slate-700 font-medium mb-6">
            Growth on LinkedIn in India in 2026 comes down to four things: post in your own voice, pick post types that
            earn reach instead of begging for it, show up about three times a week, and ignore most of the advice aimed
            at you. That is the guide. The rest of this post is the evidence — the real numbers on LinkedIn India, the
            Indian creators who got it right, what actually changed in the algorithm, and a 90-day plan you can start on
            Monday.
          </p>
          <p className={P}>
            We are going to be blunt about a few things the hype crowd will not tell you. Reach is down. Most “personal
            branding” advice is recycled from American accounts that have never written for an Indian audience. And the
            single biggest growth lever — sounding like yourself — is the one nobody sells, because it cannot be packaged
            into a course.
          </p>

          <h2 className={H2}>1. The state of LinkedIn India in 2026</h2>
          <p className={P}>
            India is LinkedIn’s second-largest market after the United States, and one of the fastest-growing of any
            major market. By early 2025 the country had crossed roughly 150 million members — and it added about 30
            million in a single year, a growth rate near 25% (
            <a href="https://datareportal.com/essential-linkedin-stats" target="_blank" rel="noopener noreferrer" style={linkSx}>
              DataReportal
            </a>
            ;{' '}
            <a
              href="https://www.theglobalstatistics.com/india-linkedin-user-statistics/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkSx}
            >
              The Global Statistics
            </a>
            ). The United States sits at around 250 million; India is closing the gap every quarter. If that pace holds,
            India passes 180 million members during 2026.
          </p>
          <p className={P}>A few facts worth holding in your head before you post anything:</p>
          <ul className={UL}>
            <li>
              <strong className={STRONG}>India is around 10% penetrated.</strong> Roughly one in ten Indians is on
              LinkedIn — against far higher rates in the US. The audience is still arriving. That is good news for anyone
              starting now.
            </li>
            <li>
              <strong className={STRONG}>The audience skews male and metro, but that is shifting.</strong> About 30% of
              Indian members are women. The Bombay–Bangalore–Delhi triangle still dominates, but Tier-2 cities are the
              fastest-growing segment.
            </li>
            <li>
              <strong className={STRONG}>Reach fell, hard.</strong> LinkedIn re-tuned its feed to favour relevance over
              virality (
              <a href="https://blog.hootsuite.com/linkedin-algorithm/" target="_blank" rel="noopener noreferrer" style={linkSx}>
                Hootsuite
              </a>
              ), and independent creator-side analyses put the resulting drop in organic reach at around half year on
              year. The posts that worked in 2023 do not work now.
            </li>
          </ul>
          <p className={P}>
            One pattern holds across almost every Indian post that travels: it opens with something specific. A number, a
            rupee figure, a named company in the first line. The posts that open with a generic motivational hook —
            “success is a mindset” — are the ones that get scrolled past. Specificity is the cheapest growth lever in the
            market, and almost nobody uses it.
          </p>

          <Figure
            src={`${DIAGRAM_BASE}/diagram-1-reach-funnel.svg`}
            alt="A funnel showing LinkedIn reach narrowing from impressions to profile visits to new followers to inbound (DMs, leads, job offers). Most advice obsesses over the top; growth that pays you back lives at the bottom."
            caption="Diagram 1 — The LinkedIn India reach funnel"
            w={720}
            h={400}
          />

          <h2 className={H2}>2. Why most Indian creators fail</h2>
          <p className={P}>
            Most people who start posting on LinkedIn in India quit within eight weeks. It is not because they are bad
            writers. It is because of three specific, fixable mistakes.
          </p>

          <h3 className={H3}>Reason 1 — They sound like a press release, not a person</h3>
          <p className={P}>
            This is the big one. So much of Indian LinkedIn reads like a company announcement written by a committee —
            high on “performance,” low on “warmth,” the exact imbalance our{' '}
            <Link href="/voice-analyzer" style={linkSx}>
              free voice analyzer
            </Link>{' '}
            is built to surface. “Thrilled to share that I have joined…” “Humbled and honoured to announce…” Nobody talks
            like this at a chai stall, in a standup, or on a founders’ WhatsApp group. Yet the moment people open the
            LinkedIn box, they put on a tie made of words.
          </p>
          <p className={P}>
            The fix is not to be casual. It is to be yourself. Write the post, then read it aloud. If you would not say
            that sentence to a colleague over coffee, cut it.
          </p>

          <h3 className={H3}>Reason 2 — They copy American accounts</h3>
          <p className={P}>
            Open most Indian LinkedIn feeds and you will see the same imported templates: the one-line-per-paragraph
            “broetry,” the fake-humble origin story, the “I fired my best employee and here is what it taught me about
            leadership” set piece. These formats were optimised for an American audience three years ago. They read as
            inauthentic to an Indian reader, who can smell a borrowed voice instantly.
          </p>
          <p className={P}>
            The creators who broke out in India did the opposite. Ankur Warikoo built his following by writing plainly
            about the things most founders hide — the company that failed, the layoffs he had to make, the money
            mistakes he repeated. Radhika Gupta wrote about being rejected from jobs, about her stammer, about being
            underestimated, in language a 22-year-old in Indore could feel. Neither of them sounds American. That is the
            point.
          </p>

          <h3 className={H3}>Reason 3 — They quit before the compounding starts</h3>
          <p className={P}>
            LinkedIn growth in India is not linear. For the first six to eight weeks, almost nothing happens, and most
            people read that silence as failure. The pattern is familiar: reach stays flat while the algorithm gathers
            signal, then climbs once it has enough to trust the account. The people who quit at day 30 quit one month
            before it would have worked.
          </p>

          <h2 className={H2}>3. The 4 post types that actually work</h2>
          <p className={P}>
            Forget “10 content pillars.” In an Indian feed in 2026, four post types do almost all the heavy lifting. Pick
            two you can write honestly and rotate them.
          </p>

          <h3 className={H3}>Type 1 — The teardown</h3>
          <p className={P}>
            Take one specific thing and explain exactly how it works. How a D2C brand got its CAC down to ₹180. How a
            ₹10,000 ad spend reached four lakh people. How a SaaS team closed its first enterprise deal without a sales
            person. Teardowns travel because they are useful and because they are specific — the reader saves them. For a
            B2B audience, this is often the single most reliable format you can write.
          </p>

          <h3 className={H3}>Type 2 — The honest post-mortem</h3>
          <p className={P}>
            Write about something that did not work, and what it cost you. Not the polished “failure taught me grit”
            version — the real one, with numbers. The pricing experiment that lost you customers. The hire that did not
            work out. Indian readers are tired of the highlight reel; a genuine post-mortem stops the scroll because it
            is rare. This is the Warikoo and Radhika Gupta lane, and it is wide open for everyone else.
          </p>

          <h3 className={H3}>Type 3 — The contrarian take</h3>
          <p className={P}>
            State a clear, defensible opinion that goes against the consensus in your field — and then back it. Kunal
            Shah built an audience on exactly this: short, sharp observations about human behaviour that make you stop
            and argue in your head. Nikhil Kamath does a version of it on markets and money. The rule is simple — have an
            actual position, and be willing to be wrong in public. A take with no edge is a quote card.
          </p>

          <h3 className={H3}>Type 4 — The build-in-public update</h3>
          <p className={P}>
            Share a real number from your own work this week. MRR crossed a milestone. You hired your first PM. A feature
            shipped and broke and you fixed it. Aprameya Radhakrishna built credibility writing openly about building for
            India’s vernacular internet, numbers and all. Build-in-public works because it cannot be faked — you either
            did the thing or you did not.
          </p>

          <Figure
            src={`${DIAGRAM_BASE}/diagram-2-post-type-quadrant.svg`}
            alt="A 2x2 matrix. X-axis useful to personal, Y-axis low to high effort. Top-left teardown, top-right honest post-mortem, bottom-left contrarian take, bottom-right build-in-public. Start in the low-effort row, then earn the right to the top row."
            caption="Diagram 2 — The post-type quadrant"
            w={720}
            h={470}
          />

          <h2 className={H2}>4. The Hinglish question — should you mix languages?</h2>
          <p className={P}>
            Short answer: yes, if it is how you actually speak. No, if you are doing it to seem relatable.
          </p>
          <p className={P}>
            Hinglish is not a gimmick on Indian LinkedIn — it is how a large part of the audience thinks. A line like
            “the unit economics were solid, par cash flow ne maar diya” lands harder than its all-English translation
            because it is closer to how the reader’s own head works. A natural Hinglish phrase in the first two lines
            tends to hold an Indian reader longer than the fully formal English version of the same point — the same
            reason a good WhatsApp forward is rarely in textbook English.
          </p>
          <p className={P}>
            But there is a trap. Hinglish used as decoration — a “kya baat hai” pasted onto an otherwise corporate post —
            reads as pandering, and Indian readers catch it immediately. The test is whether the Hindi (or Tamil, or
            Marathi, or Bangla) word is the most precise word, or merely the most relatable-sounding one. “Jugaad” is
            often the precise word. “Bhai” at the start of a serious post usually is not.
          </p>
          <p className={P}>Three practical rules:</p>
          <ul className={UL}>
            <li>
              <strong className={STRONG}>Match the register to the reader.</strong> A post for CFOs is mostly English. A
              post for early founders or students can carry more Hinglish.
            </li>
            <li>
              <strong className={STRONG}>Never translate yourself.</strong> If you would say the phrase in Hindi to a
              friend, write it in Hindi. Do not write the English version and then sprinkle Hindi on top.
            </li>
            <li>
              <strong className={STRONG}>Keep the spelling consistent.</strong> “Paisa,” not “paise” one week and
              “paisaa” the next. Small thing, but it signals care.
            </li>
          </ul>
          <p className={P}>
            If you are not sure whether your mix sounds natural, that is exactly what a voice tool is for — run a few of
            your real posts through the{' '}
            <Link href="/voice-analyzer" style={linkSx}>
              voice analyzer
            </Link>{' '}
            and see whether your scored voice matches how you actually talk.
          </p>

          <h2 className={H2}>5. Posting frequency: what the data shows</h2>
          <p className={P}>
            The advice you have heard is “post every day.” For most Indian professionals with a real job, that is the
            wrong target.
          </p>
          <p className={P}>
            What matters is consistency, not volume. LinkedIn’s own data shows that posting weekly produces roughly a
            two-times lift in engagement (
            <a href="https://blog.hootsuite.com/linkedin-algorithm/" target="_blank" rel="noopener noreferrer" style={linkSx}>
              Hootsuite
            </a>
            ). Returns climb steeply as you move from zero to about three posts a week, then flatten — going from three
            to seven rarely doubles your reach, but it does roughly double the work, and daily posting is where most
            people burn out and quit. Three considered posts a week is the sustainable habit that compounds; daily
            posting is a full-time content job.
          </p>
          <p className={P}>
            There is a quality cost to volume, too. When you force a daily post, most days you have nothing to say, so
            you reach for filler — the recycled quote, the “happy Monday” check-in, the engagement-bait question. Those
            posts do not only underperform; they teach the algorithm that your account is low-signal, which drags down
            the posts that actually matter.
          </p>
          <p className={P}>Our rule of thumb for a working professional with a real job:</p>
          <ul className={UL}>
            <li>
              <strong className={STRONG}>2–3 posts a week</strong> if you are building an audience on the side.
            </li>
            <li>
              <strong className={STRONG}>3–4 posts a week</strong> if growth is part of your actual mandate (founders,
              solo consultants, agency owners).
            </li>
            <li>
              <strong className={STRONG}>Daily only</strong> if content is your full-time work and you have a system
              behind it.
            </li>
          </ul>

          <Figure
            src={`${DIAGRAM_BASE}/diagram-3-frequency-curve.svg`}
            alt="A line chart of posting frequency versus follower growth. Growth rises steeply from zero to about three posts a week, then flattens. Three a week is marked as the best effort-to-reward ratio. A separate dashed line shows burnout risk rising steadily with frequency."
            caption="Diagram 3 — Posting frequency vs. reach"
            w={720}
            h={430}
          />

          <h2 className={H2}>6. The algorithm in 2026 (what changed)</h2>
          <p className={P}>
            LinkedIn quietly rebuilt how the feed works, and most people have not updated their playbook. Here is what
            actually changed, with sources.
          </p>
          <p className={P}>
            <strong className={STRONG}>Relevance replaced reach.</strong> LinkedIn stopped optimising for raw views and
            started optimising for whether a post reaches the <em>right</em> people — a shift its{' '}
            <a href="https://www.linkedin.com/blog/engineering" target="_blank" rel="noopener noreferrer" style={linkSx}>
              Engineering blog
            </a>{' '}
            describes and trackers like{' '}
            <a href="https://blog.hootsuite.com/linkedin-algorithm/" target="_blank" rel="noopener noreferrer" style={linkSx}>
              Hootsuite
            </a>{' '}
            summarise. Independent analyses put the resulting drop in organic reach at around half year on year. A post
            that reaches 800 people in your field is now worth more than one that reaches 8,000 strangers — and the
            algorithm agrees.
          </p>
          <p className={P}>
            <strong className={STRONG}>Comment quality beats comment quantity.</strong> The feed now reads the substance
            of comment threads, not only the count. Twelve real replies that spark a back-and-forth will out-distribute
            fifty “Great post” reactions. This is why engagement pods stopped working — a wall of generic comments now
            signals low quality, not high.
          </p>
          <p className={P}>
            <strong className={STRONG}>Conversation extends shelf life.</strong> A post that keeps generating genuine
            discussion can stay in the feed for up to three weeks, not the day or two it used to get. A good post in 2026
            is an asset that keeps working, which is another argument against churning out daily filler.
          </p>
          <p className={P}>
            <strong className={STRONG}>Commenting is a growth lever, not a courtesy.</strong> Leaving a thoughtful
            comment on someone else’s post meaningfully raises the odds that your next post shows up in their feed — by
            as much as 70% in published analyses of the feed. Twenty minutes of real commenting a day does more for your
            reach than a fifth weekly post.
          </p>
          <p className={P}>
            <strong className={STRONG}>Native and video are favoured.</strong> LinkedIn pushes content that keeps people
            on the platform, so external links are throttled (put them in the first comment) and native video tends to
            get several times the engagement of a text post. You do not need video to grow, but if you can make one good
            native video a week, the algorithm will reward it.
          </p>
          <p className={P}>
            <strong className={STRONG}>Hashtags: three to five, no more.</strong> More than five can trip spam filters
            and cut your reach. Use specific ones, not the broad popular tags.
          </p>

          <h2 className={H2}>7. Building an audience without being cringe</h2>
          <p className={P}>
            This is the section the courses skip, because “be less cringe” does not sell. But it is the difference
            between an audience that respects you and one that scrolls past.
          </p>
          <p className={P}>
            The cringe comes from manipulation, and Indian readers are unusually good at spotting it. The fixes are
            mostly about removing things:
          </p>
          <ul className={UL}>
            <li>
              <strong className={STRONG}>No “Agree?” or “Thoughts?”</strong> at the end of every post. If the post is
              good, people will comment. The tag is a tell that you do not trust your own content.
            </li>
            <li>
              <strong className={STRONG}>No “comment GROWTH and I’ll DM you the guide.”</strong> It games the comment
              count and everyone knows it. It also makes you look like you are running a funnel, not sharing an idea.
            </li>
            <li>
              <strong className={STRONG}>No fake vulnerability.</strong> “I cried in my car after the meeting” had better
              be true, and had better have a point. Performed emotion is the fastest way to lose a smart reader.
            </li>
            <li>
              <strong className={STRONG}>No mass-tagging.</strong> Tagging ten people who have nothing to do with the
              post to borrow their network is spam, and it now hurts reach.
            </li>
          </ul>
          <p className={P}>
            What to do instead is simple and unglamorous. Reply to every comment in the first hour — the conversation is
            the post. Spend twenty minutes a day leaving real comments on other people’s work, especially people
            slightly bigger than you. Share specifics, credit your sources, and let one strong idea stand on its own
            without dressing it up. An audience built this way is smaller at first and far more valuable later, because
            it is made of people who actually read you.
          </p>

          <h2 className={H2}>8. Tools that help</h2>
          <p className={P}>
            You can do all of this with a notes app and discipline. Most people do not, because the bottleneck is not
            knowing what to write — it is sounding like yourself, consistently, when you are busy. That is the specific
            problem we built PersonaLink to solve.
          </p>
          <p className={P}>
            PersonaLink reads your last 30 LinkedIn posts, learns how you actually write, and drafts one post a day in
            your voice. You approve it before it goes out — nothing posts without you. It is built in India, bills in
            rupees with a GST invoice, and handles Hinglish properly rather than mangling it. The pricing is plain:
            ₹1,499 a month, cancel any time. You can see the full breakdown on our{' '}
            <Link href="/pricing" style={linkSx}>
              pricing page
            </Link>
            .
          </p>
          <p className={P}>
            If you are comparing options, most global tools were built for an American workflow and price in dollars. We
            wrote a straight comparison of{' '}
            <Link href="/vs/taplio" style={linkSx}>
              PersonaLink versus Taplio
            </Link>{' '}
            for Indian creators — including the INR billing and Hinglish differences — so you can decide without a sales
            call. And if you run an agency posting for multiple clients, the{' '}
            <Link href="/for-agencies" style={linkSx}>
              for-agencies
            </Link>{' '}
            setup gives each client their own voice fingerprint and a white-label dashboard, so one writer can keep ten
            founders sounding like themselves.
          </p>
          <p className={P}>
            The honest framing: a tool helps you keep the rhythm and protect your voice. It does not replace having
            something to say. Start with the{' '}
            <Link href="/voice-analyzer" style={linkSx}>
              free voice analyzer
            </Link>{' '}
            — it costs nothing and tells you whether you have a voice worth scaling in the first place.
          </p>

          <h2 className={H2}>9. The 90-day plan</h2>
          <p className={P}>
            Ninety days is enough to get past the flat stretch and into the part where it compounds. Here is the plan we
            would give a founder or professional starting from near-zero.
          </p>

          <h3 className={H3}>Days 1–30: Foundation</h3>
          <p className={P}>
            Fix your profile first — headline that says what you do for whom, a banner that is not the default, an
            “About” section written in your own voice. Run your three best existing posts through the{' '}
            <Link href="/voice-analyzer" style={linkSx}>
              voice analyzer
            </Link>{' '}
            so you know your starting point. Then post twice a week, choosing from the four post types in section 3, and
            comment thoughtfully on five posts a day. Do not check your follower count. You are gathering data on what
            feels natural to write, not chasing reach. Reach will be flat. That is expected.
          </p>

          <h3 className={H3}>Days 31–60: Rhythm</h3>
          <p className={P}>
            Move to three posts a week. By now you will know which one or two post types you can write honestly — double
            down on those and drop the rest. Add one “anchor” post a week: a proper teardown or a real contrarian take
            that you put extra effort into. Keep commenting daily. Somewhere in this window — usually around the six-week
            mark — the flat line starts to bend. When a post outperforms, do not move on — study why, and write a second
            post in the same vein.
          </p>

          <h3 className={H3}>Days 61–90: Compounding</h3>
          <p className={P}>
            Hold three to four posts a week and start repurposing your winners — the teardown that worked in week six
            becomes a slightly different teardown in week eleven. Begin paying attention to the bottom of the funnel:
            profile visits, DMs, inbound. That is the growth that pays you back. By day 90 you should have a repeatable
            rhythm, a clear sense of your two best post types, and the first trickle of inbound. That is the foundation.
            Months four through twelve are this, continued.
          </p>

          <Figure
            src={`${DIAGRAM_BASE}/diagram-4-90-day-timeline.svg`}
            alt="A 90-day timeline in three segments. Days 1 to 30 foundation, two posts a week, reach flat. Days 31 to 60 rhythm, three posts a week, the line bends up around week six. Days 61 to 90 compounding, three to four posts a week, inbound begins. Most people quit at day 30."
            caption="Diagram 4 — The 90-day plan"
            w={720}
            h={380}
          />

          <h2 className={H2}>10. Frequently asked questions</h2>
          {FAQS.map(({ q, a }) => (
            <div key={q} className="mb-6">
              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">{q}</h3>
              <p className="mb-0">{a}</p>
            </div>
          ))}

          <div
            style={{
              marginTop: 48,
              padding: 24,
              background: 'var(--pl-accent-soft)',
              border: '1px solid color-mix(in oklab, var(--pl-accent) 25%, transparent)',
              borderRadius: 16,
            }}
          >
            <h3 style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.02em', fontSize: 18 }}>
              Keep the rhythm without writing every post yourself
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
              PersonaLink reads your last 30 posts, learns your voice, and drafts one post a day. You approve it. It
              posts. ₹1,499/month, GST included, cancel any time.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              <Link
                href="/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--pl-accent)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                See pricing →
              </Link>
              <Link href="/voice-analyzer" style={{ ...linkSx, fontSize: 13 }}>
                or try the free voice analyzer
              </Link>
            </div>
          </div>
        </div>
      </article>

      <footer style={{ background: 'var(--ink)', padding: '40px 24px', textAlign: 'center', marginTop: 32 }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(238,242,251,.45)', letterSpacing: '.04em' }}>
          © 2026 PersonaLink. Your LinkedIn, on autopilot.
        </p>
      </footer>
    </div>
  )
}
