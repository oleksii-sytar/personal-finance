'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSystemTheme, type ResolvedTheme } from '@/hooks/use-system-theme'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  systemTheme: ResolvedTheme
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Theme provider that manages theme state, persistence, and system detection
 * 
 * Provides theme context to all child components with:
 * - Current theme mode ('light', 'dark', 'system')
 * - Resolved theme (actual theme being used)
 * - Theme setter function
 * - System theme detection
 * - localStorage persistence with error handling
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey = 'forma-theme' 
}: ThemeProviderProps) {
  const systemTheme = useSystemTheme()
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Server-side rendering fallback
    if (typeof window === 'undefined') {
      return defaultTheme
    }

    // Try to get theme from localStorage
    const storedTheme = getStoredTheme(storageKey)
    return storedTheme ?? defaultTheme
  })

  // Calculate resolved theme based on current theme and system preference
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  // Update CSS custom properties when resolved theme changes
  useEffect(() => {
    updateCSSCustomProperties(resolvedTheme)
  }, [resolvedTheme])

  // Persist theme to localStorage when it changes
  useEffect(() => {
    setStoredTheme(storageKey, theme)
  }, [theme, storageKey])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
  }

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    systemTheme,
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access theme context
 * 
 * @returns Theme context with current theme state and controls
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

/**
 * Get theme from localStorage with error handling
 * 
 * @param key - localStorage key
 * @returns Stored theme or null if not found/invalid
 */
function getStoredTheme(key: string): ThemeMode | null {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key)
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode
      }
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error)
  }
  return null
}

/**
 * Save theme to localStorage with error handling
 * 
 * @param key - localStorage key
 * @param theme - Theme to store
 */
function setStoredTheme(key: string, theme: ThemeMode): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, theme)
    }
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error)
  }
}

/**
 * Update CSS custom properties based on resolved theme
 * 
 * @param resolvedTheme - The actual theme to apply
 */
function updateCSSCustomProperties(resolvedTheme: ResolvedTheme): void {
  try {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      
      // Set data-theme attribute for CSS theme switching
      root.setAttribute('data-theme', resolvedTheme)
      
      if (resolvedTheme === 'dark') {
        // Dark mode colors (Night Cockpit)
        root.style.setProperty('--bg-primary', '#1C1917')
        root.style.setProperty('--bg-secondary', '#2A1D15')
        root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.04)')
        root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.9)')
        root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.6)')
        root.style.setProperty('--accent-primary', '#E6A65D')
        root.style.setProperty('--accent-secondary', '#5C3A21')
        root.style.setProperty('--success', '#4E7A58')
        root.style.setProperty('--warning', '#D97706')
        root.style.setProperty('--error', '#EF4444')
        root.style.setProperty('--ambient-glow', 'rgba(230, 166, 93, 0.15)')
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)')
        root.style.setProperty('--shadow', 'rgba(230, 166, 93, 0.4)')
      } else {
        // Light mode colors (Day Studio)
        root.style.setProperty('--bg-primary', '#F5F5F4')
        root.style.setProperty('--bg-secondary', '#E7E5E4')
        root.style.setProperty('--bg-glass', '#FFFFFF')
        root.style.setProperty('--text-primary', '#1C1917')
        root.style.setProperty('--text-secondary', 'rgba(28, 25, 23, 0.6)')
        root.style.setProperty('--accent-primary', '#B45309')
        root.style.setProperty('--accent-secondary', '#92400E')
        root.style.setProperty('--success', '#166534')
        root.style.setProperty('--warning', '#A16207')
        root.style.setProperty('--error', '#DC2626')
        root.style.setProperty('--ambient-glow', 'rgba(180, 83, 9, 0.1)')
        root.style.setProperty('--glass-border', 'rgba(28, 25, 23, 0.1)')
        root.style.setProperty('--shadow', 'rgba(180, 83, 9, 0.2)')
      }
    }
  } catch (error) {
    console.warn('Failed to update CSS custom properties:', error)
  }
}