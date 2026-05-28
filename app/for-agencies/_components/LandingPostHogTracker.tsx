'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

export function LandingPostHogTracker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.posthog?.capture) return
    const params = new URLSearchParams(window.location.search)
    const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    const props: Record<string, string> = { referrer: document.referrer }
    utm.forEach(k => {
      const v = params.get(k)
      if (v) props[k] = v
    })
    window.posthog.capture('agency_landing_viewed', props)
  }, [])
  return null
}
