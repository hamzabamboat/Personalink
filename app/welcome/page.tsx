import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FirstPost } from './_components/first-post'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'

export const metadata = { title: 'Your first post — PersonaLink' }

export default async function WelcomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/?error=not_signed_in')

  const created = user.created_at ? new Date(user.created_at).getTime() : 0
  // eslint-disable-next-line react-hooks/purity -- async Server Component; Date.now() runs server-side only
  const ageH = created ? (Date.now() - created) / 36e5 : 0
  if (ageH >= 24 && ageH <= 48) {
    const { data: p } = await supabaseAdmin
      .from('user_profiles').select('day2_event_fired').eq('user_id', user.id).maybeSingle()
    if (p && !p.day2_event_fired) {
      try { getPostHogClient().capture({ distinctId: user.id, event: 'returned_day_2' }) } catch {}
      await supabaseAdmin.from('user_profiles').update({ day2_event_fired: true }).eq('user_id', user.id)
    }
  }

  const hasLinkedIn = !!user.linkedin_access_token
  return <FirstPost hasLinkedIn={hasLinkedIn} />
}
