import Link from 'next/link'
import { Check } from 'lucide-react'
import { WordMark } from '@/components/word-mark'
import {
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_COMMISSION_DURATION_MONTHS,
} from '@/lib/affiliate'

const COMMISSION_PCT = Math.round(AFFILIATE_COMMISSION_RATE * 100 * 10) / 10

export const metadata = {
  title: 'Affiliate program — earn 27.5% recurring · PersonaLink',
  description:
    'Earn 27.5% of every paid month for 12 months on every customer you send. ' +
    'Razorpay, PayPal, Wise, or bank payout. Built for India-first creators and global partners.',
  alternates: { canonical: 'https://personalink.in/affiliate' },
}

export default function AffiliateLandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-4 sm:px-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/"><WordMark icon wordmark iconSize={28} /></Link>
          <Link href="/" className="text-[13px]" style={{ color: 'var(--ink-3)' }}>← Back to home</Link>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">

        {/* ── Hero ── */}
        <section className="text-center mb-12 md:mb-16">
          <div
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide mb-5"
            style={{ background: 'var(--surface-2)', color: 'var(--pl-accent)', border: '1px solid var(--line)' }}
          >
            Personalink Partners
          </div>
          <h1 className="text-[30px] md:text-[46px] font-bold tracking-tight leading-[1.08] mb-4" style={{ color: 'var(--ink)' }}>
            Earn <span style={{ color: 'var(--pl-accent)' }}>{COMMISSION_PCT}%</span> recurring on every
            <br className="hidden md:block" /> Personalink customer you send.
          </h1>
          <p className="text-[15px] md:text-[17px] max-w-[640px] mx-auto mb-7" style={{ color: 'var(--ink-3)' }}>
            {COMMISSION_PCT}% commission on every paid month for {AFFILIATE_COMMISSION_DURATION_MONTHS} months.
            INR or international payouts. No caps. No hoops.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/affiliate/apply"
              className="px-6 py-3 rounded-xl text-[14px] font-bold transition-transform hover:scale-[1.02]"
              style={{ background: 'var(--ink)', color: 'var(--bg)', boxShadow: 'var(--sh-3)' }}
            >
              Apply to join
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3 rounded-xl text-[14px] font-semibold"
              style={{ color: 'var(--ink-3)' }}
            >
              See how it works →
            </a>
          </div>
        </section>

        {/* ── Headline stats ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14 md:mb-20">
          {[
            { value: `${COMMISSION_PCT}%`, label: 'Commission rate' },
            { value: `${AFFILIATE_COMMISSION_DURATION_MONTHS} mo`, label: 'Per referred customer' },
            { value: '30 days', label: 'Cookie window' },
            { value: '₹4,000', label: 'Min payout' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-4 md:p-5 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <div className="text-[22px] md:text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--ink)' }}>
                {stat.value}
              </div>
              <div className="text-[11px] md:text-[12px] uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="mb-16 md:mb-20">
          <h2 className="text-[22px] md:text-[28px] font-bold tracking-tight text-center mb-2" style={{ color: 'var(--ink)' }}>
            How it works
          </h2>
          <p className="text-center text-[14px] md:text-[15px] mb-8 md:mb-10" style={{ color: 'var(--ink-4)' }}>
            Three steps. No quotas. Earn as long as your referrals keep paying.
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                n: '01',
                title: 'Apply in 2 minutes',
                body: 'Sign in with LinkedIn, tell us your audience and how you’ll promote. Most applications are reviewed within one working day.',
              },
              {
                n: '02',
                title: 'Share your link',
                body: 'On approval, you get a unique ?ref=YOURCODE link. Post it, embed it, drop it in your newsletter — every signup is attributed to you for 30 days.',
              },
              {
                n: '03',
                title: 'Get paid every month',
                body: `When your referrals start paying, you earn ${COMMISSION_PCT}% of every charge for ${AFFILIATE_COMMISSION_DURATION_MONTHS} months. Request payout when your balance crosses ₹4,000.`,
              },
            ].map(step => (
              <li
                key={step.n}
                className="rounded-2xl p-5 md:p-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div className="text-[11px] font-bold mb-3" style={{ color: 'var(--pl-accent)' }}>
                  STEP {step.n}
                </div>
                <h3 className="text-[16px] md:text-[18px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
                  {step.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Earnings example ── */}
        <section className="mb-16 md:mb-20">
          <div
            className="rounded-2xl p-6 md:p-8 max-w-[840px] mx-auto"
            style={{ background: 'var(--pl-accent)', color: '#fff', boxShadow: 'var(--sh-3)' }}
          >
            <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,.7)' }}>
              Earnings example
            </div>
            <h3 className="text-[20px] md:text-[26px] font-bold leading-tight mb-4">
              Refer 20 customers on Standard. Earn ~₹1,64,934 over a year.
            </h3>
            <p className="text-[13.5px] md:text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,.85)' }}>
              At our Standard plan (₹2,499/mo), {COMMISSION_PCT}% × 12 months × 20 customers
              ={' '}
              <strong>₹1,64,934</strong>. Pro customers earn you ~₹16,497 each. Annual subscribers pay you in one
              lump up front.
            </p>
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,.7)' }}>
              All payouts in INR, converted from USD/EUR/GBP at credit time. No FX surprises.
            </p>
          </div>
        </section>

        {/* ── Why partner ── */}
        <section className="mb-16 md:mb-20">
          <h2 className="text-[22px] md:text-[28px] font-bold tracking-tight text-center mb-8 md:mb-10" style={{ color: 'var(--ink)' }}>
            Why partner with Personalink
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'A product that actually converts',
                body: 'Personalink fingerprints your audience’s voice in 6 dimensions and writes posts that sound like them — not generic AI. Every draft is constrained to that voice fingerprint.',
              },
              {
                title: 'India-first means India-trust',
                body: 'Razorpay UPI, GST invoices, Hinglish support. Your Indian audience doesn’t lose 2–4% on FX or get blocked by 2FA. Conversion follows.',
              },
              {
                title: 'Real-time attribution',
                body: 'See every signup, trial start, and paid charge live in your dashboard. No black-box “pending” status that mysteriously disappears at month-end.',
              },
              {
                title: 'Direct line to the team',
                body: 'Approved partners get a Slack/WhatsApp channel with the founders. Co-marketing, custom landing pages, early product access — we say yes a lot.',
              },
            ].map(b => (
              <div
                key={b.title}
                className="flex gap-3 rounded-2xl p-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <Check className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--pl-accent)' }} strokeWidth={2.5} />
                <div>
                  <h3 className="text-[15px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{b.title}</h3>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-16 md:mb-20 max-w-[760px] mx-auto">
          <h2 className="text-[22px] md:text-[28px] font-bold tracking-tight text-center mb-8 md:mb-10" style={{ color: 'var(--ink)' }}>
            Common questions
          </h2>
          <div className="flex flex-col gap-3">
            {[
              {
                q: 'Who can become an affiliate?',
                a:
                  'Anyone with an audience that overlaps with creators, founders, or B2B operators on LinkedIn. We approve case-by-case based on your channels and audience fit — not follower count alone. Small, engaged audiences often convert better than big cold ones.',
              },
              {
                q: 'When do I get paid?',
                a:
                  `Commissions accrue daily as your referrals' charges clear. Once your balance crosses ₹4,000 you can request a payout from your dashboard — paid within 5 business days via your chosen method (Razorpay, PayPal, Wise, or bank transfer).`,
              },
              {
                q: 'What if a referral cancels or refunds?',
                a:
                  'Commissions on cancelled charges are clawed back — but only that specific charge, not the whole referral. If the customer comes back next month, the next month’s commission still credits. Fair both ways.',
              },
              {
                q: 'Can I also offer a discount to my audience?',
                a:
                  'Not directly — the 27.5% covers your commission only. If you want a co-branded discount, ask after you’re approved and we’ll discuss a custom code based on your reach.',
              },
              {
                q: 'Can I refer myself or my own company?',
                a:
                  'No self-referrals — accounts created with the same email, payment method, or device as the affiliate are flagged automatically and commission voided. Honest mistakes get a warning; repeat attempts mean suspension.',
              },
              {
                q: 'What happens after 12 months?',
                a:
                  `Commissions stop on that specific referral. You can keep earning by sending new customers any time — there's no cap on how many people you can refer or how long you can stay an affiliate.`,
              },
            ].map((item, i) => (
              <details
                key={i}
                className="rounded-xl p-4 group"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <summary
                  className="text-[14px] md:text-[15px] font-semibold cursor-pointer list-none flex items-start justify-between gap-3"
                  style={{ color: 'var(--ink)' }}
                >
                  <span>{item.q}</span>
                  <span
                    className="text-[18px] leading-none group-open:rotate-45 transition-transform flex-shrink-0"
                    style={{ color: 'var(--ink-4)' }}
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="text-[13.5px] leading-relaxed mt-3" style={{ color: 'var(--ink-3)' }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="text-center pb-6">
          <h2 className="text-[22px] md:text-[28px] font-bold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
            Ready to start earning?
          </h2>
          <p className="text-[14px] md:text-[15px] mb-6" style={{ color: 'var(--ink-4)' }}>
            Two minutes to apply. One working day to hear back.
          </p>
          <Link
            href="/affiliate/apply"
            className="inline-block px-7 py-3.5 rounded-xl text-[15px] font-bold transition-transform hover:scale-[1.02]"
            style={{ background: 'var(--ink)', color: 'var(--bg)', boxShadow: 'var(--sh-3)' }}
          >
            Apply to join
          </Link>
        </section>
      </main>
    </div>
  )
}
