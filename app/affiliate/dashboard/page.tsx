import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { WordMark } from '@/components/word-mark'
import { buildShareLink, AFFILIATE_COMMISSION_RATE, AFFILIATE_COMMISSION_DURATION_MONTHS } from '@/lib/affiliate'
import { CopyShareLink } from './copy-share-link'
import { RequestPayoutButton } from './request-payout-button'

export const metadata = {
  title: 'Affiliate dashboard · PersonaLink',
  robots: { index: false },
}

const MIN_PAYOUT_INR = 4000

type Affiliate = {
  id: string
  ref_code: string
  status: string
  full_name: string
  email: string
  commission_rate: number
  payout_method: string | null
}

type CommissionRow = {
  status: string
  commission_amount_inr: number
}

type ReferralRow = {
  status: string
  first_paid_at: string | null
  commission_expires_at: string | null
}

async function getAffiliateForViewer(): Promise<Affiliate | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('session_user_id')?.value
  if (!userId) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from('affiliates')
    .select('id, ref_code, status, full_name, email, commission_rate, payout_method')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Affiliate | null) ?? null
}

async function getStats(affiliateId: string): Promise<{
  referrals: ReferralRow[]
  commissions: CommissionRow[]
  pendingPayoutInr: number
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const [{ data: referrals }, { data: commissions }, { data: outstandingPayouts }] = await Promise.all([
    supabase
      .from('affiliate_referrals')
      .select('status, first_paid_at, commission_expires_at')
      .eq('affiliate_id', affiliateId),
    supabase
      .from('affiliate_commissions')
      .select('status, commission_amount_inr')
      .eq('affiliate_id', affiliateId),
    supabase
      .from('affiliate_payouts')
      .select('total_amount_inr, status')
      .eq('affiliate_id', affiliateId)
      .in('status', ['requested', 'processing']),
  ])

  const pendingPayoutInr =
    (outstandingPayouts ?? []).reduce((sum, p) => sum + Number(p.total_amount_inr ?? 0), 0)

  return {
    referrals: (referrals as ReferralRow[]) ?? [],
    commissions: (commissions as CommissionRow[]) ?? [],
    pendingPayoutInr,
  }
}

function inrFmt(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export default async function AffiliateDashboardPage() {
  const affiliate = await getAffiliateForViewer()
  if (!affiliate) redirect('/affiliate/apply')
  if (affiliate.status !== 'approved') redirect('/affiliate/apply')

  const { referrals, commissions, pendingPayoutInr } = await getStats(affiliate.id)
  const shareLink = buildShareLink(affiliate.ref_code)

  const totalReferrals = referrals.length
  const payingReferrals = referrals.filter(r => r.first_paid_at).length
  const earnedTotal = commissions
    .filter(c => c.status !== 'void' && c.status !== 'clawback')
    .reduce((sum, c) => sum + Number(c.commission_amount_inr), 0)
  const paidTotal = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount_inr), 0)
  const balance = earnedTotal - paidTotal - pendingPayoutInr
  const canRequestPayout = balance >= MIN_PAYOUT_INR

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-4 sm:px-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/"><WordMark icon wordmark iconSize={28} /></Link>
          <Link href="/dashboard" className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Personalink app →</Link>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10 md:py-14">

        {/* Header row */}
        <div className="mb-8 md:mb-10">
          <div className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--pl-accent)' }}>
            Partner dashboard
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            Welcome back, {affiliate.full_name.split(' ')[0]}
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--ink-4)' }}>
            {Math.round(affiliate.commission_rate * 100 * 10) / 10}% commission · {AFFILIATE_COMMISSION_DURATION_MONTHS}-month window per referral.
          </p>
        </div>

        {/* Share link card */}
        <section
          className="rounded-2xl p-5 md:p-6 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <div className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-4)' }}>
            Your share link
          </div>
          <CopyShareLink shareLink={shareLink} refCode={affiliate.ref_code} />
          <p className="text-[12px] mt-3" style={{ color: 'var(--ink-4)' }}>
            Any signup within 30 days of clicking this link is attributed to you.
          </p>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Total referrals" value={String(totalReferrals)} />
          <Stat label="Paying customers" value={String(payingReferrals)} />
          <Stat label="Lifetime earned" value={inrFmt(earnedTotal)} />
          <Stat label="Available balance" value={inrFmt(balance)} accent={balance >= MIN_PAYOUT_INR} />
        </section>

        {/* Payout row */}
        <section
          className="rounded-2xl p-5 md:p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <div>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>
              Request payout
            </div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-4)' }}>
              {canRequestPayout
                ? `Available to withdraw: ${inrFmt(balance)} via ${affiliate.payout_method ?? 'your saved method'}.`
                : `Minimum payout is ${inrFmt(MIN_PAYOUT_INR)}. You're ${inrFmt(MIN_PAYOUT_INR - balance)} away.`}
              {pendingPayoutInr > 0 && ` (${inrFmt(pendingPayoutInr)} already processing.)`}
            </div>
          </div>
          <RequestPayoutButton enabled={canRequestPayout} balanceInr={balance} />
        </section>

        {/* Recent commissions */}
        <section
          className="rounded-2xl p-5 md:p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <h2 className="text-[15px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Commission summary</h2>
          {commissions.length === 0 ? (
            <p className="text-[13.5px]" style={{ color: 'var(--ink-4)' }}>
              No commissions yet. Once your referrals start paying, charges show up here within minutes.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13.5px]">
              {(['pending','approved','paid','clawback'] as const).map(status => {
                const list = commissions.filter(c => c.status === status)
                const total = list.reduce((s, c) => s + Number(c.commission_amount_inr), 0)
                return (
                  <div key={status} className="rounded-xl px-3 py-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--ink-4)' }}>{status}</div>
                    <div className="font-bold" style={{ color: 'var(--ink)' }}>{inrFmt(total)}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-4)' }}>{list.length} charge{list.length === 1 ? '' : 's'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: accent ? 'var(--pl-accent)' : 'var(--surface)',
        border: accent ? 'none' : '1px solid var(--line)',
        color: accent ? '#fff' : 'var(--ink)',
      }}
    >
      <div
        className="text-[11px] uppercase tracking-wide mb-1"
        style={{ color: accent ? 'rgba(255,255,255,.7)' : 'var(--ink-4)' }}
      >
        {label}
      </div>
      <div className="text-[20px] md:text-[24px] font-bold">{value}</div>
    </div>
  )
}
