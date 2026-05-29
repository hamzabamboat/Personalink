import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { WordMark } from '@/components/word-mark'
import { AffiliateApplyForm } from './apply-form'

export const metadata = {
  title: 'Apply to the affiliate program · PersonaLink',
  description: 'Two-minute application. One working day to hear back.',
  robots: { index: false, follow: true },
}

async function getViewerOrNull(): Promise<{ id: string; email: string | null; name: string | null } | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('session_user_id')?.value
  if (!userId) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('users')
    .select('id, email, linkedin_name')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return { id: data.id as string, email: (data.email as string | null) ?? null, name: (data.linkedin_name as string | null) ?? null }
}

async function getExistingApplication(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('affiliates')
    .select('id, status, ref_code, applied_at, approved_at, rejected_reason')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? null
}

export default async function AffiliateApplyPage() {
  const viewer = await getViewerOrNull()
  const existing = viewer ? await getExistingApplication(viewer.id) : null

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-4 sm:px-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/"><WordMark icon wordmark iconSize={28} /></Link>
          <Link href="/affiliate" className="text-[13px]" style={{ color: 'var(--ink-3)' }}>← Back to overview</Link>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-12 md:py-16">

        {!viewer ? (
          <SignInGate />
        ) : existing ? (
          <ExistingApplicationStatus status={existing.status} refCode={existing.ref_code as string | null} rejectedReason={existing.rejected_reason as string | null} />
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
                Apply to join
              </h1>
              <p className="text-[14px] md:text-[15px]" style={{ color: 'var(--ink-4)' }}>
                Signed in as <strong>{viewer.name ?? viewer.email ?? 'you'}</strong>. Two minutes to fill in.
              </p>
            </div>
            <AffiliateApplyForm prefillName={viewer.name ?? ''} prefillEmail={viewer.email ?? ''} />
          </>
        )}

      </main>
    </div>
  )
}

function SignInGate() {
  return (
    <div className="rounded-2xl p-8 md:p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <h1 className="text-[24px] md:text-[30px] font-bold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
        Sign in to apply
      </h1>
      <p className="text-[14px] md:text-[15px] mb-7" style={{ color: 'var(--ink-3)' }}>
        We sign affiliates in with LinkedIn so we can verify you’re a real human. Same one-click flow — no
        password.
      </p>
      <form action="/api/affiliate/start-auth" method="post">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--ink)', color: 'var(--bg)', boxShadow: 'var(--sh-3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04s-2.14 1.44-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 .01-4.13 2.06 2.06 0 0 1-.01 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
          </svg>
          Continue with LinkedIn
        </button>
      </form>
      <p className="text-[12px] mt-5" style={{ color: 'var(--ink-4)' }}>
        We’ll bring you straight back here after sign-in.
      </p>
    </div>
  )
}

function ExistingApplicationStatus({ status, refCode, rejectedReason }: {
  status: string
  refCode: string | null
  rejectedReason: string | null
}) {
  if (status === 'approved' && refCode) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: 'var(--ink)' }}>You’re already an approved affiliate ✓</h1>
        <p className="text-[14px] mb-6" style={{ color: 'var(--ink-3)' }}>Your referral code is <strong>{refCode}</strong>.</p>
        <Link href="/affiliate/dashboard" className="inline-block px-6 py-3 rounded-xl text-[14px] font-bold"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
          Open partner dashboard →
        </Link>
      </div>
    )
  }
  if (status === 'pending') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Application received</h1>
        <p className="text-[14px]" style={{ color: 'var(--ink-3)' }}>
          We’re reviewing — most decisions land within one working day. You’ll get an email at the address on
          file once your account is approved.
        </p>
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Application not approved</h1>
        <p className="text-[14px] mb-3" style={{ color: 'var(--ink-3)' }}>
          {rejectedReason || 'Your application didn’t meet our current bar.'}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--ink-4)' }}>
          Reach out to <a href="mailto:partners@personalink.in" style={{ color: 'var(--pl-accent)' }}>partners@personalink.in</a> if you’d like a second look.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <h1 className="text-[24px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Account suspended</h1>
      <p className="text-[14px]" style={{ color: 'var(--ink-3)' }}>
        Contact <a href="mailto:partners@personalink.in" style={{ color: 'var(--pl-accent)' }}>partners@personalink.in</a> to discuss.
      </p>
    </div>
  )
}
