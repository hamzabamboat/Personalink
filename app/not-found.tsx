import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
        </div>
        <div className="text-5xl font-black text-slate-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button render={<Link href="/dashboard" />}>Go to Dashboard</Button>
          <Button variant="outline" render={<Link href="/" />}>Home</Button>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Need help?{' '}
          <a href="mailto:support@personalink.in" className="text-blue-500 hover:underline">support@personalink.in</a>
        </p>
      </div>
    </div>
  )
}
