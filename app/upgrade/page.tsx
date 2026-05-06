'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect legacy /upgrade to the new settings plan tab
export default function UpgradePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/settings?tab=plan') }, [router])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#64748b' }}>
      Redirecting...
    </div>
  )
}
