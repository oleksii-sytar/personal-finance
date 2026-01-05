/**
 * @file Property-based tests for theme state management
 * Feature: theme-switching, Property 1: Theme State Management
 * 
 * Tests that for any theme mode ('light', 'dark', 'system'), the Theme_System 
 * correctly manages state transitions and provides the expected interface through React context.
 * 
 * Validates: Requirements 1.1, 1.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, useTheme, type ThemeMode } from '@/contexts/theme-context'

// Test component to access theme context
function ThemeTestComponent() {
  const { theme, resolvedTheme, setTheme, systemTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <div data-testid="system-theme">{systemTheme}</div>
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

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock matchMedia for system theme detection
const mockMatchMedia = vi.fn()

describe('Property 1: Theme State Management', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
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

  it('Property 1.1: Theme context provides correct interface for any theme mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (themeMode: ThemeMode) => {
          // Mock localStorage to return the test theme
          mockLocalStorage.getItem.mockReturnValue(themeMode)
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={themeMode}>
              <ThemeTestComponent />
            </ThemeProvider>
          )

          try {
            // Verify theme context provides all required properties
            expect(screen.getByTestId('current-theme')).toBeInTheDocument()
            expect(screen.getByTestId('resolved-theme')).toBeInTheDocument()
            expect(screen.getByTestId('system-theme')).toBeInTheDocument()
            
            // Verify setTheme functions are available
            expect(screen.getByTestId('set-light')).toBeInTheDocument()
            expect(screen.getByTestId('set-dark')).toBeInTheDocument()
            expect(screen.getByTestId('set-system')).toBeInTheDocument()
            
            // Verify current theme matches expected
            const currentTheme = screen.getByTestId('current-theme').textContent
            expect(['light', 'dark', 'system']).toContain(currentTheme)
          } finally {
            // Clean up after each property test run
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.2: Theme state transitions work correctly for any theme mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.constantFrom('light', 'dark', 'system'),
        (initialTheme: ThemeMode, targetTheme: ThemeMode) => {
          // Mock localStorage for initial theme
          mockLocalStorage.getItem.mockReturnValue(initialTheme)
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={initialTheme}>
              <ThemeTestComponent />
            </ThemeProvider>
          )

          try {
            // Verify initial theme
            expect(screen.getByTestId('current-theme')).toHaveTextContent(initialTheme)

            // Change to target theme
            const setButton = screen.getByTestId(`set-${targetTheme}`)
            act(() => {
              setButton.click()
            })

            // Verify theme changed
            expect(screen.getByTestId('current-theme')).toHaveTextContent(targetTheme)
            
            // Verify localStorage was called to persist the change
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('forma-theme', targetTheme)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.3: Resolved theme correctly maps system theme when theme is system', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isDarkSystem: boolean) => {
          // Mock system theme preference
          mockMatchMedia.mockImplementation((query: string) => ({
            matches: query.includes('dark') ? isDarkSystem : !isDarkSystem,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }))
          
          const { unmount } = render(
            <ThemeProvider defaultTheme="system">
              <ThemeTestComponent />
            </ThemeProvider>
          )

          try {
            // When theme is 'system', resolved theme should match system preference
            expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
            
            const expectedResolvedTheme = isDarkSystem ? 'dark' : 'light'
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent(expectedResolvedTheme)
            expect(screen.getByTestId('system-theme')).toHaveTextContent(expectedResolvedTheme)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.4: Resolved theme matches theme mode when not system', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (themeMode: ThemeMode) => {
          const { unmount } = render(
            <ThemeProvider defaultTheme={themeMode}>
              <ThemeTestComponent />
            </ThemeProvider>
          )

          try {
            // When theme is not 'system', resolved theme should match theme mode
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
            expect(screen.getByTestId('resolved-theme')).toHaveTextContent(themeMode)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.5: useTheme throws error when used outside ThemeProvider', () => {
    // Component that tries to use theme outside provider
    function InvalidComponent() {
      const theme = useTheme()
      return <div>{theme.theme}</div>
    }

    // Should throw error when useTheme is used outside provider
    expect(() => {
      render(<InvalidComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')
  })

  it('Property 1.6: Theme context handles localStorage errors gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (themeMode: ThemeMode) => {
          // Mock localStorage to throw error
          mockLocalStorage.getItem.mockImplementation(() => {
            throw new Error('localStorage error')
          })
          
          // Should not crash and should use default theme
          const { unmount } = render(
            <ThemeProvider defaultTheme={themeMode}>
              <ThemeTestComponent />
            </ThemeProvider>
          )

          try {
            // Should render without crashing
            expect(screen.getByTestId('current-theme')).toBeInTheDocument()
            
            // Should use default theme when localStorage fails
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeMode)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})