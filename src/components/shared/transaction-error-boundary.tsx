/**
 * Transaction-specific error boundary component
 * Provides graceful error handling for transaction-related components
 */

'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class TransactionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Transaction Error Boundary caught an error:', error, errorInfo)
    
    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Transaction Error Boundary')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-glass border border-glass rounded-xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-primary mb-2">
            Something went wrong
          </h3>
          
          <p className="text-secondary mb-4 max-w-md">
            We encountered an error while loading your transactions. This has been logged and we're working to fix it.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-left max-w-md">
              <summary className="cursor-pointer text-sm font-medium text-red-600 mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-500 whitespace-pre-wrap overflow-auto max-h-32">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={this.handleRetry}
              variant="primary"
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="w-4 h-4" />
              Try Again
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
            >
              Reload Page
            </Button>
          </div>
          
          <p className="text-xs text-muted mt-4">
            If this problem persists, please contact support.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useTransactionErrorHandler() {
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Transaction error:', error)
    
    // Report to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })
    
    // You could also show a toast notification here
    // toast.error('Something went wrong. Please try again.')
  }

  return { handleError }
}