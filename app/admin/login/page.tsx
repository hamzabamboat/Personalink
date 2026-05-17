'use client'

import { useState, useEffect } from 'react'

export default function AdminLoginPage() {
  useEffect(() => { document.title = 'Admin Login — PersonaLink' }, [])
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
    if (res.ok) {
      window.location.href = '/admin'
    } else {
      setError('Invalid secret')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 360, border: '1px solid var(--line)', boxShadow: '0 24px 64px -12px rgba(0,0,0,.5)' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, background: 'var(--pl-accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 100 100">
                <g transform="translate(50 50) rotate(10)" fill="#ffffff">
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" />
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(60)" />
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(120)" />
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(180)" />
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(240)" />
                  <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(300)" />
                </g>
              </svg>
            </div>
          </div>
          <h1 style={{ color: 'var(--ink)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.025em', margin: '0 0 4px' }}>Admin Access</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>PersonaLink internal dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter admin secret"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 pr-11 text-sm border border-slate-600 focus:outline-none focus:border-brand placeholder:text-slate-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.96 9.96 0 015.657 1.757M15 12a3 3 0 11-4.243-4.243M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full bg-brand text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
