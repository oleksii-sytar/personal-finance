/**
 * Simplified Performance Monitor Provider
 * Basic performance tracking without over-engineering
 */

'use client'

import { useEffect } from 'react'

interface PerformanceMonitorProviderProps {
  children: React.ReactNode
}

/**
 * Simplified provider that sets up basic performance monitoring
 */
export function PerformanceMonitorProvider({ children }: PerformanceMonitorProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return

    // Simple page load tracking for development
    const trackPageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart
        if (loadTime > 3000) { // Only log if slow
          console.warn(`⚠️ Slow page load: ${loadTime.toFixed(0)}ms`)
        }
      }
    }

    if (document.readyState === 'complete') {
      trackPageLoad()
    } else {
      window.addEventListener('load', trackPageLoad, { once: true })
    }
  }, [])

  return <>{children}</>
}