/**
 * @file Property-based tests for theme persistence round trip
 * Feature: theme-switching, Property 2: Theme Persistence Round Trip
 * 
 * Tests that for any valid theme selection, storing the theme in localStorage 
 * and then retrieving it produces the same theme value.
 * 
 * Validates: Requirements 1.2, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, useTheme, type ThemeMode } from '@/contexts/theme-context'

// Test component to interact with theme
function ThemePersistenceTestComponent() {
  const { theme, setTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
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

// Mock localStorage with actual storage behavior
const createMockLocalStorage = () => {
  const storage: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    _storage: storage, // For test inspection
  }
}

// Mock matchMedia
const mockMatchMedia = vi.fn()

describe('Property 2: Theme Persistence Round Trip', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Create fresh localStorage mock
    mockLocalStorage = createMockLocalStorage()
    
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
    
    // Default matchMedia implementation
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

  it('Property 2.1: Theme persistence round trip preserves any valid theme value', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (themeMode: ThemeMode) => {
          // Start with clean localStorage
          mockLocalStorage.clear()
          
          const { unmount: unmount1 } = render(
            <ThemeProvider>
              <ThemePersistenceTestComponent />
            </ThemeProvider>
          )

          try {
            // Set the theme
            const setButton = screen.getByTestId(`set-${themeMode}`)
            act(() => {
              setButton.click()
            })

            // Verify theme was set in component
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
            
            // Verify theme was stored in localStorage
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('forma-theme', themeMode)
            expect(mockLocalStorage._storage['forma-theme']).toBe(themeMode)
          } finally {
            unmount1()
          }
          
          // Simulate page reload by creating new provider instance
          // The stored theme should be retrieved and used
          const { unmount: unmount2 } = render(
            <ThemeProvider>
              <ThemePersistenceTestComponent />
            </ThemeProvider>
          )

          try {
            // Verify the theme was restored from localStorage
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('forma-theme')
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
          } finally {
            unmount2()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 2.2: Custom storage key works for theme persistence', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        (themeMode: ThemeMode, customKey: string) => {
          let unmount: (() => void) | undefined
          
          try {
            // Start with clean localStorage
            mockLocalStorage.clear()
            
            const renderResult = render(
              <ThemeProvider storageKey={customKey}>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Set the theme
            const setButton = screen.getByTestId(`set-${themeMode}`)
            act(() => {
              setButton.click()
            })

            // Verify theme was stored with custom key
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(customKey, themeMode)
            expect(mockLocalStorage._storage[customKey]).toBe(themeMode)
            
            // Verify default key was not used
            expect(mockLocalStorage._storage['forma-theme']).toBeUndefined()
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

  it('Property 2.3: Invalid stored theme values are ignored and default is used', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !['light', 'dark', 'system'].includes(s)),
        fc.constantFrom('light', 'dark', 'system'),
        (invalidTheme: string, defaultTheme: ThemeMode) => {
          let unmount: (() => void) | undefined
          
          try {
            // Pre-populate localStorage with invalid theme
            mockLocalStorage._storage['forma-theme'] = invalidTheme
            
            const renderResult = render(
              <ThemeProvider defaultTheme={defaultTheme}>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should ignore invalid stored theme and use default
            expect(screen.getByTestId('current-theme')).toHaveTextContent(defaultTheme)
            
            // Should have attempted to read from localStorage
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('forma-theme')
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

  it('Property 2.4: Theme persistence works across multiple theme changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light', 'dark', 'system'), { minLength: 2, maxLength: 5 }),
        (themeSequence: ThemeMode[]) => {
          let unmount: (() => void) | undefined
          
          try {
            // Start with clean localStorage
            mockLocalStorage.clear()
            
            const renderResult = render(
              <ThemeProvider>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Apply each theme in sequence
            themeSequence.forEach((themeMode, index) => {
              const setButton = screen.getByTestId(`set-${themeMode}`)
              act(() => {
                setButton.click()
              })

              // Verify current theme
              expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
              
              // Verify localStorage was updated
              expect(mockLocalStorage.setItem).toHaveBeenCalledWith('forma-theme', themeMode)
              expect(mockLocalStorage._storage['forma-theme']).toBe(themeMode)
            })

            // Final theme should be the last one in sequence
            const finalTheme = themeSequence[themeSequence.length - 1]
            expect(screen.getByTestId('current-theme')).toHaveTextContent(finalTheme)
            expect(mockLocalStorage._storage['forma-theme']).toBe(finalTheme)
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

  it('Property 2.5: Theme persistence handles empty localStorage gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (defaultTheme: ThemeMode) => {
          let unmount: (() => void) | undefined
          
          try {
            // Ensure localStorage is empty
            mockLocalStorage.clear()
            
            const renderResult = render(
              <ThemeProvider defaultTheme={defaultTheme}>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount = renderResult.unmount

            // Should use default theme when no stored theme exists
            expect(screen.getByTestId('current-theme')).toHaveTextContent(defaultTheme)
            
            // Should have attempted to read from localStorage
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('forma-theme')
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

  it('Property 2.6: Theme persistence survives provider remount', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (themeMode: ThemeMode) => {
          let unmount1: (() => void) | undefined
          let unmount2: (() => void) | undefined
          
          try {
            // Start with clean localStorage
            mockLocalStorage.clear()
            
            // First provider instance
            const renderResult1 = render(
              <ThemeProvider>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount1 = renderResult1.unmount

            // Set theme
            const setButton = screen.getByTestId(`set-${themeMode}`)
            act(() => {
              setButton.click()
            })

            // Verify theme was set and stored
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
            expect(mockLocalStorage._storage['forma-theme']).toBe(themeMode)
            
            // Unmount first provider
            unmount1()
            unmount1 = undefined

            // Mount new provider instance (simulates page reload/navigation)
            const renderResult2 = render(
              <ThemeProvider>
                <ThemePersistenceTestComponent />
              </ThemeProvider>
            )
            unmount2 = renderResult2.unmount

            // Theme should be restored from localStorage
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
          } finally {
            if (unmount1) {
              unmount1()
            }
            if (unmount2) {
              unmount2()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})