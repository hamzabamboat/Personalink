'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">
            An unexpected error occurred. This has been logged and we'll look into it.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            size="sm"
          >
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
