'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { handleNetworkError, getNetworkStatus } from '@/lib/utils/network-fallbacks'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  isNetworkError: boolean
  networkStatus: ReturnType<typeof getNetworkStatus>
}

/**
 * NetworkErrorBoundary for handling network-related errors gracefully
 * Provides appropriate fallbacks for network issues
 * Requirements: 14.3, 14.4, 14.5
 */
export class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isNetworkError: false,
      networkStatus: { isOnline: true }
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const networkError = handleNetworkError(error, 'application')
    const networkStatus = getNetworkStatus()
    
    return {
      hasError: true,
      error,
      isNetworkError: networkError.shouldRetry,
      networkStatus
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Network error boundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Log network-specific errors
    if (this.state.isNetworkError) {
      console.warn('Network error detected:', {
        error: error.message,
        networkStatus: this.state.networkStatus,
        stack: error.stack
      })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isNetworkError: false,
      networkStatus: getNetworkStatus()
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Network-specific error UI
      if (this.state.isNetworkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Issue
              </h2>
              
              <p className="text-gray-600 mb-4">
                {this.state.networkStatus.isOnline 
                  ? 'Unable to connect to our services. This might be a temporary issue.'
                  : 'You appear to be offline. Please check your internet connection.'
                }
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reload Page
                </button>
              </div>
              
              {!this.state.networkStatus.isOnline && (
                <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Offline Mode:</strong> Some features may be limited until your connection is restored.
                  </p>
                </div>
              )}
              
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                  <div><strong>Error:</strong> {this.state.error?.message}</div>
                  <div><strong>Online:</strong> {this.state.networkStatus.isOnline ? 'Yes' : 'No'}</div>
                  {this.state.networkStatus.effectiveType && (
                    <div><strong>Connection:</strong> {this.state.networkStatus.effectiveType}</div>
                  )}
                  <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                </div>
              </details>
            </div>
          </div>
        )
      }

      // Generic error UI for non-network errors
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component for wrapping components with network error boundary
 * Requirements: 14.3, 14.5
 */
export function withNetworkErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <NetworkErrorBoundary fallback={fallback}>
        <Component {...props} />
      </NetworkErrorBoundary>
    )
  }
}