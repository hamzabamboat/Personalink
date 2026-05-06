'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

function ApproveContent() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const action = searchParams.get('action') as 'approve' | 'reject' | null
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_done'>('loading')
  const [result, setResult] = useState<string>('')

  useEffect(() => {
    const body = token && action ? JSON.stringify({ token, action }) : null
    if (!body) {
      Promise.resolve().then(() => { setStatus('error'); setResult('Invalid approval link.') })
      return
    }
    fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (data.status) { setStatus('already_done'); setResult(data.status) }
          else { setStatus('error'); setResult(data.error) }
        } else { setStatus('success'); setResult(data.status) }
      })
      .catch(() => { setStatus('error'); setResult('Network error. Please try again.') })
  }, [token, action])

  const isApprove = action === 'approve'

  const statusConfig = {
    loading: { icon: Loader2, iconColor: '#94a3b8', iconBg: '#f1f5f9', spin: true, title: 'Processing...' },
    success: isApprove
      ? { icon: CheckCircle2, iconColor: '#059669', iconBg: '#ecfdf5', spin: false, title: 'Post Approved!' }
      : { icon: XCircle, iconColor: '#dc2626', iconBg: '#fef2f2', spin: false, title: 'Post Rejected' },
    error: { icon: AlertCircle, iconColor: '#d97706', iconBg: '#fffbeb', spin: false, title: 'Something went wrong' },
    already_done: { icon: AlertCircle, iconColor: '#64748b', iconBg: '#f8fafc', spin: false, title: 'Already Processed' },
  }

  const cfg = statusConfig[status]
  const Icon = cfg.icon

  const message = status === 'loading' ? 'Please wait...'
    : status === 'success' && isApprove ? 'Your post has been approved and is ready to publish. Head to your dashboard to schedule it.'
    : status === 'success' ? 'Your post has been rejected and will not be published.'
    : status === 'already_done' ? `This post has already been ${result}.`
    : result

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
      <Card className="max-w-[420px] w-full border-slate-100 shadow-sm">
        <CardContent className="pt-10 pb-10 px-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: cfg.iconBg }}>
            <Icon
              className={`w-8 h-8 ${cfg.spin ? 'animate-spin' : ''}`}
              style={{ color: cfg.iconColor }}
              strokeWidth={1.75}
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{cfg.title}</h1>
          <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">{message}</p>
          <Button render={<a href="/dashboard" />} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default function ApprovePage() {
  return <Suspense><ApproveContent /></Suspense>
}
