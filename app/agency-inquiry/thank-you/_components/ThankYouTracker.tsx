'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

export function ThankYouTracker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.posthog?.capture) return
    window.posthog.capture('agency_thank_you_viewed')
  }, [])
  return null
}
