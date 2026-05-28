import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { FeatureTable } from './FeatureTable'
import { SavingsCalculator } from './SavingsCalculator'
import { type Competitor, inr } from '@/lib/competitor-data'

type Props = { competitor: Competitor }

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'var(--serif-ink)',
}

export function ComparisonPage({ competitor }: Props) {
  const c = competitor
  const subhead = c.hero.subhead.replace('{{save}}', inr(c.hero.headlineSavings))

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <Nav />

      {/* ── Hero ── */}
      <section
        style={{
          padding: 'clamp(48px, 8vw, 96px) var(--pad) clamp(40px, 6vw, 72px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18,
              fontFamily: 'var(--f-mono)',
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: 'var(--ink-3)',
              padding: '6px 12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-xs)',
              background: 'var(--surface)',
            }}
          >
            // alternatives · {c.name}
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-sans)',
              fontWeight: 700,
              fontSize: 'clamp(32px, 6vw, 64px)',
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              margin: '0 0 18px',
              maxWidth: 920,
              color: 'var(--ink)',
            }}
          >
            {c.name} Alternative <span style={SERIF}>for Indian Creators.</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.4vw, 20px)',
              color: 'var(--ink-3)',
              lineHeight: 1.55,
              maxWidth: 720,
              margin: '0 0 28px',
            }}
          >
            {subhead}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href={`/?utm_source=vs_page&utm_medium=hero_cta&utm_campaign=vs_${c.slug}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 24px',
                background: 'var(--ink)',
                color: 'var(--bg)',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Try free for 7 days
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <a
              href="#calculator"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 24px',
                background: 'transparent',
                color: 'var(--ink)',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              See savings calculator
            </a>
          </div>

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              fontSize: 13,
              color: 'var(--ink-4)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            <span>// no card required</span>
            <span>// cancel in one click</span>
            <span>// GST invoices · UPI accepted</span>
          </div>
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <Section eyebrow="// 01 — Feature comparison" id="features">
        <Header
          title={<>How PersonaLink stacks up <span style={SERIF}>against {c.name}.</span></>}
          sub={`Honest, line-by-line. Green is where PersonaLink wins, red is where ${c.name} loses, and we call out the two or three places they\'re still ahead.`}
        />
        <FeatureTable competitorName={c.name} rows={c.features} />
      </Section>

      {/* ── Savings calculator ── */}
      <Section eyebrow="// 02 — Savings calculator" id="calculator" subdued>
        <Header
          title={<>Drag the sliders. <span style={SERIF}>See your number.</span></>}
          sub={`Year-1 total cost vs ${c.name} based on how often you actually post. Agencies, drag the second slider — we\'ll route you to a custom quote.`}
        />
        <SavingsCalculator competitor={c} />
      </Section>

      {/* ── Migration ── */}
      <Section eyebrow="// 03 — Migration" id="migration">
        <Header
          title={<>Switch from {c.name} <span style={SERIF}>in five minutes.</span></>}
          sub="Three steps. We handle the messy bits so you don’t lose a single scheduled post."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {c.migration.map((step, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                padding: '24px 22px',
                position: 'relative',
                boxShadow: 'var(--sh-1)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--pl-accent)',
                  marginBottom: 10,
                }}
              >
                Step 0{i + 1}
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  margin: '0 0 8px',
                  letterSpacing: '-0.01em',
                  color: 'var(--ink)',
                }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 14,
            color: 'var(--ink-3)',
          }}
        >
          Want a hand?{' '}
          <a
            href="mailto:migrate@personalink.in"
            style={{ color: 'var(--pl-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            migrate@personalink.in
          </a>
          {' '}— we&apos;ll do the import for you.
        </div>
      </Section>

      {/* ── Honest comparison ── */}
      <Section eyebrow="// 04 — Honest comparison" id="honest" subdued>
        <Header
          title={<>When {c.name} <span style={SERIF}>might be a better fit.</span></>}
          sub={`We\'re not pretending PersonaLink wins every scenario. Here\'s where ${c.name} is honestly the right pick.`}
        />
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {c.honest.map((item, i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderLeft: '3px solid var(--pl-accent)',
                borderRadius: 'var(--r-md)',
                padding: '20px 22px',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: '0 0 8px',
                  color: 'var(--ink)',
                }}
              >
                {item.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Customer quote (placeholder) ── */}
      <Section eyebrow="// 05 — Customer voices">
        <Header
          title={<>What switchers <span style={SERIF}>say after the move.</span></>}
          sub="We’re collecting real testimonials from creators who moved over. A placeholder for now."
        />
        <blockquote
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            padding: 'clamp(28px, 4vw, 40px)',
            margin: 0,
            position: 'relative',
            boxShadow: 'var(--sh-1)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 16,
              left: 18,
              fontFamily: 'var(--f-display)',
              fontSize: 64,
              lineHeight: 1,
              color: 'var(--pl-accent)',
              opacity: 0.25,
            }}
          >
            &ldquo;
          </div>
          <p
            style={{
              fontFamily: 'var(--f-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 3vw, 28px)',
              lineHeight: 1.4,
              color: 'var(--ink)',
              margin: '0 0 18px',
              paddingLeft: 28,
            }}
          >
            {c.quote.body}
          </p>
          <div style={{ paddingLeft: 28, fontSize: 13, color: 'var(--ink-3)' }}>
            <div style={{ fontWeight: 600 }}>{c.quote.name}</div>
            <div>{c.quote.role}</div>
          </div>
        </blockquote>
      </Section>

      {/* ── FAQ ── */}
      <Section eyebrow="// 06 — FAQ" id="faq" subdued>
        <Header
          title={<>Real questions, <span style={SERIF}>real answers.</span></>}
          sub={`Ten questions we get most often from people considering moving off ${c.name}.`}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {c.faq.map((f, i) => (
            <details
              key={i}
              style={{
                borderBottom: '1px solid var(--line)',
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <summary
                style={{
                  padding: '18px 0',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 15.5,
                  color: 'var(--ink)',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  userSelect: 'none',
                }}
              >
                {f.q}
                <svg
                  style={{ width: 16, height: 16, color: 'var(--ink-4)', flexShrink: 0 }}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </summary>
              <div
                style={{
                  paddingBottom: 18,
                  fontSize: 14.5,
                  color: 'var(--ink-3)',
                  lineHeight: 1.65,
                }}
              >
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <section
        style={{
          padding: 'clamp(60px, 9vw, 110px) var(--pad)',
          background: 'var(--pricing-popular-bg)',
          color: '#fff',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              fontWeight: 600,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              margin: '0 0 18px',
              color: '#fff',
            }}
          >
            Ready to leave {c.name} behind?
          </h2>
          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'rgba(255,255,255,.7)',
              lineHeight: 1.6,
              maxWidth: 540,
              margin: '0 auto 32px',
            }}
          >
            Connect LinkedIn, paste 3 sample posts, watch us write like you. Seven free days, no card up front.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: '#fff',
                color: 'var(--ink)',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Try PersonaLink free
            </Link>
            <Link
              href="/voice-analyzer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 28px',
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Test the voice analyser first
            </Link>
          </div>
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 14,
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: 13,
              color: 'rgba(255,255,255,.5)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            <Link
              href="/#pricing"
              style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              See pricing
            </Link>
            <span>·</span>
            <Link
              href="/for-agencies"
              style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              Agency plans
            </Link>
            <span>·</span>
            <Link
              href="/voice-analyzer"
              style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              Free voice analyser
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <nav
      style={{
        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max)',
          margin: '0 auto',
          padding: '0 var(--pad)',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" aria-label="PersonaLink home">
          <WordMark icon wordmark iconSize={30} />
        </Link>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <Link
            href="/#pricing"
            className="hidden md:inline"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}
          >
            Pricing
          </Link>
          <Link
            href="/voice-analyzer"
            className="hidden md:inline"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}
          >
            Voice analyser
          </Link>
          <Link
            href="/for-agencies"
            className="hidden md:inline"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}
          >
            Agencies
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--bg)',
              background: 'var(--ink)',
              padding: '9px 18px',
              borderRadius: 'var(--r-sm)',
              textDecoration: 'none',
            }}
          >
            Try free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        padding: 'clamp(28px, 4vw, 40px) var(--pad)',
        fontSize: 13,
        color: 'var(--ink-4)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max)',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>© {new Date().getFullYear()} PersonaLink · Built in India</div>
        <div style={{ display: 'flex', gap: 18 }}>
          <Link href="/vs/taplio" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>vs Taplio</Link>
          <Link href="/vs/kleo" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>vs Kleo</Link>
          <Link href="/vs/supergrow" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>vs Supergrow</Link>
        </div>
      </div>
    </footer>
  )
}

function Section({
  eyebrow,
  id,
  subdued,
  children,
}: {
  eyebrow: string
  id?: string
  subdued?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      style={{
        background: subdued ? 'var(--surface-2)' : 'var(--bg)',
        borderTop: '1px solid var(--line)',
        padding: 'clamp(56px, 8vw, 96px) var(--pad)',
      }}
    >
      <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            fontFamily: 'var(--f-mono)',
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: 'var(--ink-3)',
            padding: '6px 12px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-xs)',
            background: 'var(--surface)',
          }}
        >
          {eyebrow}
        </div>
        {children}
      </div>
    </section>
  )
}

function Header({ title, sub }: { title: React.ReactNode; sub: string }) {
  return (
    <div style={{ marginBottom: 32, maxWidth: 760 }}>
      <h2
        style={{
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: 700,
          letterSpacing: '-0.035em',
          lineHeight: 1.08,
          color: 'var(--ink)',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 'clamp(14px, 1.8vw, 16px)',
          color: 'var(--ink-3)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {sub}
      </p>
    </div>
  )
}
