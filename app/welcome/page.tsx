import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FirstPost } from './_components/first-post'

export const metadata = { title: 'Your first post — PersonaLink' }

export default async function WelcomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/?error=not_signed_in')
  const hasLinkedIn = !!user.linkedin_access_token
  return <FirstPost hasLinkedIn={hasLinkedIn} />
}
