/**
 * Performance Monitor Provider for tracking application performance
 * Requirements: 12.5, 14.5
 */

'use client'

import { useEffect } from 'react'
import { usePageRefreshMonitor } from '@/hooks/use-performance-monitor'

interface PerformanceMonitorProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that sets up global performance monitoring
 */
export function PerformanceMonitorProvider({ children }: PerformanceMonitorProviderProps) {
  // Track page refresh behavior globally
  usePageRefreshMonitor()
  
  // Set up global performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track initial page load performance
    const trackInitialLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart
        
        console.log('📊 Initial page load metrics:', {
          totalLoadTime: `${loadTime.toFixed(2)}ms`,
          domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
          navigationType: navigation.type
        })
        
        // Report to analytics if available
        if ((window as any).gtag) {
          (window as any).gtag('event', 'page_load_performance', {
            load_time: loadTime,
            dom_content_loaded: domContentLoaded,
            navigation_type: navigation.type
          })
        }
      }
    }

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackInitialLoad()
    } else {
      window.addEventListener('load', trackInitialLoad, { once: true })
    }

    // Track Core Web Vitals if available
    if ('web-vital' in window) {
      // This would integrate with web-vitals library if installed
      console.log('📊 Web Vitals tracking available')
    }

    // Set up error tracking for performance issues
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'ChunkLoadError') {
        console.warn('📊 Chunk load error detected - possible lazy loading issue')
        
        if ((window as any).gtag) {
          (window as any).gtag('event', 'chunk_load_error', {
            error_message: event.error.message,
            filename: event.filename,
            line_number: event.lineno
          })
        }
      }
    }

    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Set up development-only performance debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Add global performance debugging function
      (window as any).getPerformanceReport = () => {
        const { getPerformanceSummary } = require('@/lib/utils/performance-monitor')
        const summary = getPerformanceSummary()
        
        console.group('📊 Performance Report')
        console.log('Summary:', summary?.summary)
        console.log('Page Refresh Metrics:', summary?.pageRefreshMetrics)
        console.log('Component Metrics:', summary?.componentMetrics)
        console.log('Navigation Metrics:', summary?.navigationMetrics)
        console.groupEnd()
        
        return summary
      }

      console.log('📊 Performance monitoring enabled. Use window.getPerformanceReport() to view metrics.')
    }
  }, [])

  return <>{children}</>
}