/**
 * @file Property-based tests for theme persistence error handling
 * Feature: theme-switching, Property 11: Persistence Error Handling
 * 
 * Tests that for any localStorage error or invalid theme value, the Theme_System 
 * gracefully falls back to system theme detection.
 * 
 * Validates: Requirements 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, useTheme, type ThemeMode } from '@/contexts/theme-context'

// Test component to interact with theme
function ThemeErrorHandlingTestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button 
        data-testid="set-light" 
        onClick={() => setTheme('light')}
      >
        Set Light
      </button>
      <button 
        data-testid="set-dark" 
        onClick={() => setTheme('dark')}
      >
        Set Dark
      </button>
      <button 
        data-testid="set-system" 
        onClick={() => setTheme('system')}
      >
        Set System
      </button>
    </div>
  )
}

// Mock localStorage that can simulate various error conditions
const createErrorMockLocalStorage = () => {
  return {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
}

// Mock matchMedia
const mockMatchMedia = vi.fn()

describe('Property 11: Persistence Error Handling', () => {
  let mockLocalStorage: ReturnType<typeof createErrorMockLocalStorage>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Create fresh localStorage mock
    mockLocalStorage = createErrorMockLocalStorage()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    })
    
    // Default matchMedia implementation (system prefers dark)
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Property 11.1: localStorage read errors fall back to system theme detection', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.boolean(),
        (defaultTheme: ThemeMode, systemPrefersDark: boolean) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage.getItem to throw various errors
            mockLocalStorage.getItem.mockImplementation(() => {
              throw new Error('localStorage access denied')
            })
            
            // Mock system theme preference
            mockMatchMedia.mockImplementation((query: string) => ({
              matches: query.includes('dark') ? systemPrefersDark : !systemPrefersDark,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }))
            
            const renderResult = render(
              <ThemeProvider defaultTheme={defaultTheme}>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should not crash and should use default theme
            expect(screen.getByTestId('current-theme')).toBeInTheDocument()
            expect(screen.getByTestId('current-theme')).toHaveTextContent(defaultTheme)
            
            // Should have attempted to read from localStorage
            expect(mockLocalStorage.getItem).toHaveBeenCalled()
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.2: localStorage write errors do not crash the application', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (targetTheme: ThemeMode) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage.setItem to throw error
            mockLocalStorage.setItem.mockImplementation(() => {
              throw new Error('localStorage quota exceeded')
            })
            
            // Mock successful getItem (no stored theme)
            mockLocalStorage.getItem.mockReturnValue(null)
            
            const renderResult = render(
              <ThemeProvider>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Attempt to set theme (should not crash)
            const setButton = screen.getByTestId(`set-${targetTheme}`)
            act(() => {
              setButton.click()
            })

            // Theme should still be updated in memory even if localStorage fails
            expect(screen.getByTestId('current-theme')).toHaveTextContent(targetTheme)
            
            // Should have attempted to write to localStorage
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('forma-theme', targetTheme)
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.3: Invalid theme values in localStorage are cleared and reset to system', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !['light', 'dark', 'system'].includes(s) && s.length > 0),
        fc.boolean(),
        (invalidTheme: string, systemPrefersDark: boolean) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage to return invalid theme
            mockLocalStorage.getItem.mockReturnValue(invalidTheme)
            
            // Mock system theme preference
            mockMatchMedia.mockImplementation((query: string) => ({
              matches: query.includes('dark') ? systemPrefersDark : !systemPrefersDark,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }))
            
            const renderResult = render(
              <ThemeProvider>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should ignore invalid theme and use default (system)
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
            
            // Resolved theme should match system preference
            const expectedResolvedTheme = systemPrefersDark ? 'dark' : 'light'
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent(expectedResolvedTheme)
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.4: Null and undefined localStorage values fall back gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        fc.constantFrom('light', 'dark', 'system'),
        fc.boolean(),
        (nullishValue: null | undefined, defaultTheme: ThemeMode, systemPrefersDark: boolean) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage to return null/undefined
            mockLocalStorage.getItem.mockReturnValue(nullishValue)
            
            // Mock system theme preference
            mockMatchMedia.mockImplementation((query: string) => ({
              matches: query.includes('dark') ? systemPrefersDark : !systemPrefersDark,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }))
            
            const renderResult = render(
              <ThemeProvider defaultTheme={defaultTheme}>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should use default theme when localStorage returns null/undefined
            expect(screen.getByTestId('current-theme')).toHaveTextContent(defaultTheme)
            
            // If default is system, resolved theme should match system preference
            if (defaultTheme === 'system') {
              const expectedResolvedTheme = systemPrefersDark ? 'dark' : 'light'
              expect(screen.getByTestId('resolved-theme')).toHaveTextContent(expectedResolvedTheme)
            }
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.5: Multiple localStorage errors do not accumulate or cause crashes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light', 'dark', 'system'), { minLength: 2, maxLength: 4 }),
        (themeSequence: ThemeMode[]) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage to always throw errors
            mockLocalStorage.getItem.mockImplementation(() => {
              throw new Error('localStorage error')
            })
            mockLocalStorage.setItem.mockImplementation(() => {
              throw new Error('localStorage error')
            })
            
            const renderResult = render(
              <ThemeProvider>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Apply multiple theme changes (all should fail to persist but not crash)
            themeSequence.forEach((themeMode) => {
              const setButton = screen.getByTestId(`set-${themeMode}`)
              act(() => {
                setButton.click()
              })

              // Theme should still update in memory
              expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
            })

            // Application should still be functional
            expect(screen.getByTestId('current-theme')).toBeInTheDocument()
            expect(screen.getByTestId('resolved-theme')).toBeInTheDocument()
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.6: Empty string theme values are treated as invalid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n'),
        fc.boolean(),
        (emptyTheme: string, systemPrefersDark: boolean) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage to return empty/whitespace string
            mockLocalStorage.getItem.mockReturnValue(emptyTheme)
            
            // Mock system theme preference
            mockMatchMedia.mockImplementation((query: string) => ({
              matches: query.includes('dark') ? systemPrefersDark : !systemPrefersDark,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }))
            
            const renderResult = render(
              <ThemeProvider>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should ignore empty theme and use default (system)
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
            
            // Resolved theme should match system preference
            const expectedResolvedTheme = systemPrefersDark ? 'dark' : 'light'
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent(expectedResolvedTheme)
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 11.7: System theme detection errors fall back to dark mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (defaultTheme: ThemeMode) => {
          let unmount: (() => void) | undefined
          
          try {
            // Mock localStorage to work normally
            mockLocalStorage.getItem.mockReturnValue(null)
            
            // Mock matchMedia to throw error or be unavailable
            mockMatchMedia.mockImplementation(() => {
              throw new Error('matchMedia not supported')
            })
            
            const renderResult = render(
              <ThemeProvider defaultTheme={defaultTheme}>
                <ThemeErrorHandlingTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should use default theme
            expect(screen.getByTestId('current-theme')).toHaveTextContent(defaultTheme)
            
            // If theme is system, should fall back to dark when system detection fails
            if (defaultTheme === 'system') {
              expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
            }
          } finally {
            if (unmount) {
              unmount()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})