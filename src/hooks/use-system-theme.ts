import { useState, useEffect } from 'react'

export type ResolvedTheme = 'light' | 'dark'

/**
 * Hook to detect and monitor system theme preference
 * 
 * Uses the prefers-color-scheme media query to detect OS theme preference
 * and listens for changes to automatically update when the system theme changes.
 * 
 * @returns The current system theme preference ('light' or 'dark')
 */
export function useSystemTheme(): ResolvedTheme {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    // Server-side rendering fallback
    if (typeof window === 'undefined') {
      return 'dark'
    }

    // Detect initial system theme preference
    return getSystemTheme()
  })

  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      return
    }

    try {
      // Check if matchMedia is available
      if (!window.matchMedia) {
        return
      }

      // Create media query for dark mode preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      // Handler for media query changes
      const handleChange = (event: MediaQueryListEvent) => {
        const newTheme = event.matches ? 'dark' : 'light'
        setSystemTheme(newTheme)
      }

      // Set initial theme based on current media query state
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

      // Add event listener for system theme changes
      mediaQuery.addEventListener('change', handleChange)

      // Cleanup event listener on unmount
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } catch (error) {
      console.warn('System theme detection failed in useEffect:', error)
      // Fallback to dark theme
      setSystemTheme('dark')
    }
  }, [])

  return systemTheme
}

/**
 * Utility function to get the current system theme preference
 * 
 * @returns The current system theme ('light' or 'dark')
 */
export function getSystemTheme(): ResolvedTheme {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      return mediaQuery.matches ? 'dark' : 'light'
    }
  } catch (error) {
    console.warn('System theme detection failed:', error)
  }
  
  // Default fallback to dark mode when system detection fails
  return 'dark'
}