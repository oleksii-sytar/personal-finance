'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Error boundary for auth component isolation
 * Ensures authentication errors don't affect non-auth pages
 * Requirements: 10.1, 10.2, 10.3
 */
interface AuthComponentErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface AuthComponentErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class AuthComponentErrorBoundary extends Component<
  AuthComponentErrorBoundaryProps,
  AuthComponentErrorBoundaryState
> {
  constructor(props: AuthComponentErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AuthComponentErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Auth component error:', error, errorInfo)
    
    // Only log auth component errors, don't affect other parts
    if (error.message.includes('auth') || error.stack?.includes('auth')) {
      // Report to error tracking service if available
      if (typeof window !== 'undefined' && (window as any).reportError) {
        (window as any).reportError('AUTH_COMPONENT_ERROR', error, errorInfo)
      }
    }
    
    // Additional error context for debugging
    console.error('Error boundary context:', {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      errorMessage: error.message,
      errorStack: error.stack
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 border border-red-200 rounded-xl bg-red-50 dark:border-red-800 dark:bg-red-900/20 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-6 h-6 text-red-600 dark:text-red-400" 
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
            
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Authentication Error
            </h3>
            
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              Something went wrong with the authentication component. This error has been contained and won't affect other parts of the application.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Try Again
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Refresh Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/auth/login'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Go to Login
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack}
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