'use client'

import { useState, useEffect, ReactNode } from 'react'

interface DelayedFallbackProps {
  children: ReactNode
  delay?: number // Delay in milliseconds before showing fallback
  minDuration?: number // Minimum duration to show fallback once it appears
}

/**
 * DelayedFallback component to prevent flickering loading states
 * 
 * This component delays showing loading states for fast requests and ensures
 * they stay visible for a minimum duration to prevent jarring flicker effects.
 */
export function DelayedFallback({ 
  children, 
  delay = 200, // Don't show loading for very fast requests
  minDuration = 300 // Once shown, keep visible for at least this long
}: DelayedFallbackProps) {
  const [showFallback, setShowFallback] = useState(false)
  const [fallbackStartTime, setFallbackStartTime] = useState<number | null>(null)

  useEffect(() => {
    // Start the delay timer
    const delayTimer = setTimeout(() => {
      setShowFallback(true)
      setFallbackStartTime(Date.now())
    }, delay)

    // Cleanup function - this runs when component unmounts (loading finishes)
    return () => {
      clearTimeout(delayTimer)
      
      // If fallback was shown, ensure it stays visible for minimum duration
      if (fallbackStartTime) {
        const elapsed = Date.now() - fallbackStartTime
        const remaining = Math.max(0, minDuration - elapsed)
        
        if (remaining > 0) {
          // Keep the fallback visible for the remaining time
          setTimeout(() => {
            // Component might already be unmounted, so this is just cleanup
          }, remaining)
        }
      }
    }
  }, [delay, minDuration, fallbackStartTime])

  // Don't show anything during the initial delay
  if (!showFallback) {
    return null
  }

  return <>{children}</>
}