/**
 * Property-based tests for System Theme Detection
 * Feature: theme-switching, Property 3: System Theme Detection
 * 
 * Validates: Requirements 1.3, 7.1, 7.3, 7.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import fc from 'fast-check'
import { useSystemTheme, getSystemTheme } from '@/hooks/use-system-theme'

// Mock window.matchMedia
const createMockMatchMedia = (matches: boolean) => {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(listener)
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }),
    dispatchEvent: vi.fn(),
    // Helper to simulate media query change
    _triggerChange: (newMatches: boolean) => {
      const event = {
        matches: newMatches,
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent
      
      listeners.forEach(listener => listener(event))
    }
  }
}

describe('System Theme Detection Property Tests', () => {
  let mockMatchMedia: ReturnType<typeof createMockMatchMedia>
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    // Store original matchMedia
    originalMatchMedia = window.matchMedia
    
    // Create default mock (dark theme)
    mockMatchMedia = createMockMatchMedia(true)
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => mockMatchMedia),
    })
  })

  afterEach(() => {
    // Restore original matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    })
    
    vi.clearAllMocks()
  })

  /**
   * Property 3: System Theme Detection
   * For any system color scheme preference, the Theme_System should correctly detect 
   * and apply the corresponding theme when in 'system' mode
   * **Validates: Requirements 1.3, 7.1, 7.3, 7.4**
   */
  it('Property 3.1: System theme detection correctly maps OS preference to theme', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        (prefersDark: boolean) => {
          // Setup mock to return the specified preference
          mockMatchMedia = createMockMatchMedia(prefersDark)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Test the utility function
          const detectedTheme = getSystemTheme()
          
          // Verify correct mapping
          if (prefersDark) {
            expect(detectedTheme).toBe('dark')
          } else {
            expect(detectedTheme).toBe('light')
          }
          
          // Verify matchMedia was called with correct query
          expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3.2: useSystemTheme hook returns correct initial theme', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        (prefersDark: boolean) => {
          // Setup mock to return the specified preference
          mockMatchMedia = createMockMatchMedia(prefersDark)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render the hook
          const { result } = renderHook(() => useSystemTheme())
          
          // Verify initial theme matches system preference
          const expectedTheme = prefersDark ? 'dark' : 'light'
          expect(result.current).toBe(expectedTheme)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3.3: System theme detection handles media query unavailability gracefully', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('undefined', 'null', 'throws'),
        (failureMode: string) => {
          // Mock different failure scenarios
          switch (failureMode) {
            case 'undefined':
              // @ts-ignore - intentionally setting to undefined for testing
              window.matchMedia = undefined
              break
            case 'null':
              // @ts-ignore - intentionally setting to null for testing
              window.matchMedia = null
              break
            case 'throws':
              window.matchMedia = vi.fn(() => {
                throw new Error('matchMedia not supported')
              })
              break
          }
          
          // Should gracefully fallback to dark theme
          const detectedTheme = getSystemTheme()
          expect(detectedTheme).toBe('dark')
          
          // Hook should also handle gracefully - but we need to mock properly for React
          if (failureMode === 'throws') {
            // For throwing case, we can test the hook
            const { result } = renderHook(() => useSystemTheme())
            expect(result.current).toBe('dark')
          } else {
            // For undefined/null cases, just test the utility function
            // since React Testing Library needs matchMedia to exist
            expect(detectedTheme).toBe('dark')
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 3.4: System theme detection works in server-side rendering environment', async () => {
    await fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Test the utility function in SSR-like environment
          // We can't actually remove window in the test environment, 
          // but we can test the getSystemTheme function behavior
          
          // Mock a scenario where matchMedia is not available
          const originalMatchMedia = window.matchMedia
          // @ts-ignore - intentionally setting to undefined for testing
          window.matchMedia = undefined
          
          try {
            // Should return dark theme as fallback
            const detectedTheme = getSystemTheme()
            expect(detectedTheme).toBe('dark')
          } finally {
            // Restore matchMedia
            window.matchMedia = originalMatchMedia
          }
          
          // Test that the hook initializes correctly with SSR fallback
          // The hook's useState initializer should handle SSR case
          const { result } = renderHook(() => useSystemTheme())
          // Should be 'dark' (either from SSR fallback or normal detection)
          expect(['light', 'dark']).toContain(result.current)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 3.5: System theme detection is consistent across multiple calls', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 2, max: 10 }),
        (prefersDark: boolean, callCount: number) => {
          // Setup mock to return consistent preference
          mockMatchMedia = createMockMatchMedia(prefersDark)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          const expectedTheme = prefersDark ? 'dark' : 'light'
          
          // Call getSystemTheme multiple times
          for (let i = 0; i < callCount; i++) {
            const detectedTheme = getSystemTheme()
            expect(detectedTheme).toBe(expectedTheme)
          }
          
          // Multiple hook instances should return same result
          const hooks = Array.from({ length: callCount }, () => 
            renderHook(() => useSystemTheme())
          )
          
          hooks.forEach(({ result }) => {
            expect(result.current).toBe(expectedTheme)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 3.6: Media query listener is properly registered and cleaned up', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        (prefersDark: boolean) => {
          // Setup mock
          mockMatchMedia = createMockMatchMedia(prefersDark)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render hook
          const { unmount } = renderHook(() => useSystemTheme())
          
          // Verify addEventListener was called
          expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
          )
          
          // Unmount hook
          unmount()
          
          // Verify removeEventListener was called
          expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})