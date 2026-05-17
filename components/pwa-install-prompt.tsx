'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [dismissed, setDismissed]           = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    if (localStorage.getItem('pwaPromptDismissed')) setDismissed(true)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
  }

  function dismiss() {
    localStorage.setItem('pwaPromptDismissed', 'true')
    setDismissed(true)
  }

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS)

  return { deferredPrompt, isInstalled, isIOS, dismissed, canInstall, install, dismiss }
}

/* ── Toast (global, all devices) ──────────────────────────── */
export function PWAInstallPrompt() {
  const { isIOS, dismissed, canInstall, install, dismiss } = usePWAInstall()
  const [showToast, setShowToast] = useState(false)
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)

  useEffect(() => {
    if (!canInstall || dismissed) return
    const t = setTimeout(() => setShowToast(true), isMobile ? 5000 : 8000)
    return () => clearTimeout(t)
  }, [canInstall, dismissed, isMobile])

  if (!showToast || dismissed) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start gap-3">
          <div className="bg-white rounded-xl p-1.5 shadow-sm shrink-0">
            <img src="/icons/icon-72x72.png" alt="PersonaLink" className="w-10 h-10" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {isMobile ? 'Add PersonaLink to home screen' : 'Install PersonaLink on your desktop'}
            </h3>
            {isIOS ? (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                Tap <span className="font-medium">Share</span> then <span className="font-medium">Add to Home Screen</span> for the best experience
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                {isMobile
                  ? 'Install the app for faster access and a better mobile experience'
                  : 'Get a native-like experience — launch directly from your taskbar, no browser needed'}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!isIOS && (
                <button
                  onClick={install}
                  className="flex-1 bg-[var(--pl-accent)] text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-[#1e3a8a] transition-colors"
                >
                  Install app
                </button>
              )}
              <button
                onClick={() => { dismiss(); setShowToast(false) }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 transition-colors"
              >
                {isIOS ? 'Got it' : 'Not now'}
              </button>
            </div>
          </div>
          <button onClick={() => { dismiss(); setShowToast(false) }} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Sidebar install button (desktop, persistent) ──────────── */
export function PWAInstallSidebarButton({ collapsed = false }: { collapsed?: boolean }) {
  const { isIOS, isInstalled, canInstall, install } = usePWAInstall()

  // Safari desktop doesn't support beforeinstallprompt — skip
  if (!canInstall || isInstalled || isIOS) return null

  if (collapsed) {
    return (
      <div className="px-2 pb-3 flex justify-center" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <button
          onClick={install}
          title="Install app"
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-surface-3"
          style={{ border: '1px solid var(--line)', color: 'var(--ink-3)' }}
        >
          <Download size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <button
        onClick={install}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors hover:bg-surface-3"
        style={{ border: '1px solid var(--line)', background: 'var(--bg-2)' }}
      >
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: 'var(--pl-accent-soft)' }}>
          <Download size={13} style={{ color: 'var(--pl-accent)' }} strokeWidth={2} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
            Install desktop app
          </div>
          <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            Launch without browser
          </div>
        </div>
      </button>
    </div>
  )
}
