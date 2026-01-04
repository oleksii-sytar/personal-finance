'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
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

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for monitoring (Requirement 9.4, 9.5)
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // Error reporting service integration will be added in future version
    if (process.env.NODE_ENV === 'production') {
      // Production error logging is handled through proper error boundaries
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Security event logging (Requirement 9.4, 9.5)
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }
    
    // Log without exposing sensitive information
    console.error('Application error logged:', {
      message: error.message,
      timestamp: errorData.timestamp
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="glass-card max-w-md w-full">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-[var(--accent-error)]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Something went wrong
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="secondary"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-[var(--text-secondary)] cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-[var(--accent-error)] bg-[var(--accent-error)]/10 p-3 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Feature-specific error boundary for workspace features
interface FeatureErrorBoundaryProps {
  children: ReactNode
  featureName: string
}

export function FeatureErrorBoundary({ children, featureName }: FeatureErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Error in ${featureName}:`, error, errorInfo)
  }

  const fallback = (
    <div className="p-6 border border-red-200/20 rounded-lg bg-[var(--accent-error)]/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--accent-error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-[var(--accent-error)]">
          {featureName} Unavailable
        </h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        Unable to load {featureName}. Please try refreshing the page.
      </p>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}