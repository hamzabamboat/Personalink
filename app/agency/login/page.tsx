'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { WordMark } from '@/components/word-mark'

export default function AgencyLoginPage() {
  useEffect(() => { document.title = 'Agency Login — PersonaLink' }, [])
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/agency/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      router.push('/agency/dashboard')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <WordMark icon wordmark={false} iconSize={48} variant="white" />
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 32, border: '1px solid var(--line)', boxShadow: '0 24px 64px -12px rgba(0,0,0,.5)' }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--ink)', margin: '0 0 6px' }}>Agency Login</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>Sign in to manage your client accounts</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="db-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="agency@example.com"
                className="db-input"
              />
            </div>

            <div>
              <label className="db-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="db-input"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(185,28,28,.1)', border: '1px solid rgba(185,28,28,.3)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-dash btn-dash--lg"
              style={{ background: 'var(--pl-accent)', color: '#fff', borderColor: 'transparent', marginTop: 4, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(238,242,251,.4)', marginTop: 24 }}>
          Not an agency?{' '}
          <a href="/" style={{ color: 'var(--pl-accent)', textDecoration: 'none' }}>Back to PersonaLink</a>
        </p>
      </div>
    </div>
  )
}
