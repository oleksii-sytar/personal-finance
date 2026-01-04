/**
 * Property-based tests for System Theme Reactivity
 * Feature: theme-switching, Property 10: System Theme Reactivity
 * 
 * Validates: Requirements 7.2, 7.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import fc from 'fast-check'
import { useSystemTheme } from '@/hooks/use-system-theme'

// Mock window.matchMedia with change event support
const createMockMatchMedia = (initialMatches: boolean) => {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  let currentMatches = initialMatches
  
  const mockMediaQuery = {
    matches: currentMatches,
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
      currentMatches = newMatches
      mockMediaQuery.matches = newMatches
      
      const event = {
        matches: newMatches,
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent
      
      listeners.forEach(listener => listener(event))
    },
    // Helper to get current listeners count
    _getListenersCount: () => listeners.length
  }
  
  return mockMediaQuery
}

describe('System Theme Reactivity Property Tests', () => {
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
   * Property 10: System Theme Reactivity
   * For any system color scheme change event, the Theme_System should automatically 
   * update the application theme when in 'system' mode
   * **Validates: Requirements 7.2, 7.5**
   */
  it('Property 10.1: System theme changes trigger hook updates', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (initialPreference: boolean, newPreference: boolean) => {
          // Setup mock with initial preference
          mockMatchMedia = createMockMatchMedia(initialPreference)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render the hook
          const { result } = renderHook(() => useSystemTheme())
          
          // Verify initial theme
          const initialTheme = initialPreference ? 'dark' : 'light'
          expect(result.current).toBe(initialTheme)
          
          // Simulate system theme change
          act(() => {
            mockMatchMedia._triggerChange(newPreference)
          })
          
          // Verify theme updated to match new system preference
          const expectedNewTheme = newPreference ? 'dark' : 'light'
          expect(result.current).toBe(expectedNewTheme)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10.2: Multiple system theme changes are handled correctly', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        (initialPreference: boolean, themeChanges: boolean[]) => {
          // Setup mock with initial preference
          mockMatchMedia = createMockMatchMedia(initialPreference)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render the hook
          const { result } = renderHook(() => useSystemTheme())
          
          // Verify initial theme
          let expectedTheme = initialPreference ? 'dark' : 'light'
          expect(result.current).toBe(expectedTheme)
          
          // Apply each theme change
          themeChanges.forEach((newPreference) => {
            act(() => {
              mockMatchMedia._triggerChange(newPreference)
            })
            
            expectedTheme = newPreference ? 'dark' : 'light'
            expect(result.current).toBe(expectedTheme)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 10.3: System theme reactivity works with rapid changes', async () => {
    await fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }),
        (rapidChanges: boolean[]) => {
          // Setup mock
          mockMatchMedia = createMockMatchMedia(true)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render the hook
          const { result } = renderHook(() => useSystemTheme())
          
          // Apply rapid changes in sequence
          rapidChanges.forEach((preference, index) => {
            act(() => {
              mockMatchMedia._triggerChange(preference)
            })
            
            // Each change should be reflected immediately
            const expectedTheme = preference ? 'dark' : 'light'
            expect(result.current).toBe(expectedTheme)
          })
          
          // Final state should match the last change
          const finalExpectedTheme = rapidChanges[rapidChanges.length - 1] ? 'dark' : 'light'
          expect(result.current).toBe(finalExpectedTheme)
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 10.4: System theme changes only affect listening hooks', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (initialPreference: boolean, newPreference: boolean) => {
          // Setup mock
          mockMatchMedia = createMockMatchMedia(initialPreference)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render multiple hook instances
          const hook1 = renderHook(() => useSystemTheme())
          const hook2 = renderHook(() => useSystemTheme())
          
          // Both should have same initial value
          const initialTheme = initialPreference ? 'dark' : 'light'
          expect(hook1.result.current).toBe(initialTheme)
          expect(hook2.result.current).toBe(initialTheme)
          
          // Trigger system theme change
          act(() => {
            mockMatchMedia._triggerChange(newPreference)
          })
          
          // Both hooks should update to new theme
          const newTheme = newPreference ? 'dark' : 'light'
          expect(hook1.result.current).toBe(newTheme)
          expect(hook2.result.current).toBe(newTheme)
          
          // Unmount one hook
          hook1.unmount()
          
          // Trigger another change
          const anotherPreference = !newPreference
          act(() => {
            mockMatchMedia._triggerChange(anotherPreference)
          })
          
          // Only the remaining hook should update
          const finalTheme = anotherPreference ? 'dark' : 'light'
          expect(hook2.result.current).toBe(finalTheme)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 10.5: Event listeners are properly managed during theme changes', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (initialPreference: boolean, themeChanges: boolean[]) => {
          // Setup mock
          mockMatchMedia = createMockMatchMedia(initialPreference)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Render hook
          const { unmount } = renderHook(() => useSystemTheme())
          
          // Verify event listener was added
          expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
          )
          
          // Apply theme changes - listeners should remain stable
          themeChanges.forEach((preference) => {
            act(() => {
              mockMatchMedia._triggerChange(preference)
            })
          })
          
          // Should still have exactly one listener
          expect(mockMatchMedia._getListenersCount()).toBe(1)
          
          // Unmount should remove the listener
          unmount()
          
          expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
          )
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 10.6: System theme reactivity is consistent across hook instances', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 2, max: 5 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (initialPreference: boolean, hookCount: number, themeChanges: boolean[]) => {
          // Setup mock
          mockMatchMedia = createMockMatchMedia(initialPreference)
          window.matchMedia = vi.fn(() => mockMatchMedia)
          
          // Create multiple hook instances
          const hooks = Array.from({ length: hookCount }, () => 
            renderHook(() => useSystemTheme())
          )
          
          // All hooks should start with same theme
          const initialTheme = initialPreference ? 'dark' : 'light'
          hooks.forEach(({ result }) => {
            expect(result.current).toBe(initialTheme)
          })
          
          // Apply each theme change
          themeChanges.forEach((preference) => {
            act(() => {
              mockMatchMedia._triggerChange(preference)
            })
            
            // All hooks should update to the same new theme
            const expectedTheme = preference ? 'dark' : 'light'
            hooks.forEach(({ result }) => {
              expect(result.current).toBe(expectedTheme)
            })
          })
          
          // Cleanup
          hooks.forEach(({ unmount }) => unmount())
        }
      ),
      { numRuns: 30 }
    )
  })
})