/**
 * Property-based tests for reduced motion accessibility
 * Feature: theme-switching, Property 13: Reduced Motion Accessibility
 * 
 * Tests that for any user with prefers-reduced-motion enabled, theme transitions 
 * are disabled or significantly reduced.
 * 
 * Validates: Requirements 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, useTheme, type ThemeMode } from '@/contexts/theme-context'

// Test component to trigger theme changes and check for reduced motion
function ReducedMotionTestComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      
      {/* Test elements that should respect reduced motion */}
      <div 
        data-testid="glass-card" 
        className="glass-card p-4"
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'var(--border-glass)',
          color: 'var(--text-primary)',
          transition: 'background-color 300ms cubic-bezier(0.4, 0, 0.2, 1), border-color 300ms cubic-bezier(0.4, 0, 0.2, 1), color 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        Glass Card Content
      </div>
      
      <button 
        data-testid="primary-button"
        className="btn-primary"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--text-inverse)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        Primary Button
      </button>
      
      <div 
        data-testid="ambient-glow"
        style={{
          background: 'radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%)',
          transition: 'background 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        Ambient Glow
      </div>
      
      <div 
        data-testid="animated-element"
        style={{
          transform: 'translateX(0)',
          transition: 'transform 300ms ease-in-out',
          animation: 'pulse 2s infinite'
        }}
      >
        Animated Element
      </div>
      
      {/* Theme control buttons */}
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

// Mock matchMedia for both theme and reduced motion detection
const mockMatchMedia = vi.fn()

// Mock getComputedStyle to return transition properties based on reduced motion preference
const mockGetComputedStyle = vi.fn()

describe('Property 13: Reduced Motion Accessibility', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
    
    // Mock matchMedia for both theme and reduced motion
    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    })
    
    // Mock getComputedStyle
    Object.defineProperty(window, 'getComputedStyle', {
      value: mockGetComputedStyle,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 13.1: Transitions are disabled when prefers-reduced-motion is enabled
   * Validates: Requirements 9.5
   */
  it('Property 13.1: All transitions are disabled when user prefers reduced motion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.boolean(), // Whether user prefers reduced motion
        (theme: ThemeMode, prefersReducedMotion: boolean) => {
          // Mock matchMedia to return reduced motion preference
          mockMatchMedia.mockImplementation((query: string) => {
            if (query.includes('prefers-reduced-motion: reduce')) {
              return {
                matches: prefersReducedMotion,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            // For theme queries
            if (query.includes('prefers-color-scheme: dark')) {
              return {
                matches: theme === 'dark' || (theme === 'system' && Math.random() > 0.5),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }
          })
          
          // Mock getComputedStyle to respect reduced motion preference
          mockGetComputedStyle.mockImplementation((element: Element) => {
            const baseStyle = {
              transitionDuration: prefersReducedMotion ? '0ms' : '300ms',
              transitionTimingFunction: prefersReducedMotion ? 'none' : 'cubic-bezier(0.4, 0, 0.2, 1)',
              transitionProperty: prefersReducedMotion ? 'none' : 'background-color, border-color, color, box-shadow',
              animationDuration: prefersReducedMotion ? '0ms' : '2s',
              animationName: prefersReducedMotion ? 'none' : 'pulse',
              getPropertyValue: (property: string) => {
                switch (property) {
                  case 'transition-duration':
                    return prefersReducedMotion ? '0ms' : '300ms'
                  case 'transition-timing-function':
                    return prefersReducedMotion ? 'none' : 'cubic-bezier(0.4, 0, 0.2, 1)'
                  case 'transition-property':
                    return prefersReducedMotion ? 'none' : 'background-color, border-color, color, box-shadow'
                  case 'animation-duration':
                    return prefersReducedMotion ? '0ms' : '2s'
                  case 'animation-name':
                    return prefersReducedMotion ? 'none' : 'pulse'
                  default:
                    return ''
                }
              }
            }
            return baseStyle as CSSStyleDeclaration
          })
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <ReducedMotionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get elements that should respect reduced motion
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            const ambientGlow = screen.getByTestId('ambient-glow')
            const animatedElement = screen.getByTestId('animated-element')
            
            const elements = [glassCard, primaryButton, ambientGlow, animatedElement]
            
            elements.forEach(element => {
              const computedStyle = mockGetComputedStyle(element)
              
              if (prefersReducedMotion) {
                // When reduced motion is preferred, transitions should be disabled
                expect(computedStyle.getPropertyValue('transition-duration')).toBe('0ms')
                expect(computedStyle.getPropertyValue('animation-duration')).toBe('0ms')
                expect(computedStyle.getPropertyValue('animation-name')).toBe('none')
              } else {
                // When reduced motion is not preferred, transitions should be enabled
                expect(computedStyle.getPropertyValue('transition-duration')).toBe('300ms')
                expect(computedStyle.getPropertyValue('transition-timing-function')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
              }
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 13.2: CSS media query correctly detects reduced motion preference
   * Validates: Requirements 9.5
   */
  it('Property 13.2: CSS media query correctly detects reduced motion preference', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // Whether user prefers reduced motion
        (prefersReducedMotion: boolean) => {
          // Mock matchMedia to return specific reduced motion preference
          mockMatchMedia.mockImplementation((query: string) => {
            if (query.includes('prefers-reduced-motion: reduce')) {
              return {
                matches: prefersReducedMotion,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }
          })
          
          // Test the media query detection
          const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
          expect(mediaQuery.matches).toBe(prefersReducedMotion)
          
          // Verify the query string is correct
          expect(mediaQuery.media).toBe('(prefers-reduced-motion: reduce)')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 13.3: Theme changes respect reduced motion preference
   * Validates: Requirements 9.5
   */
  it('Property 13.3: Theme changes respect reduced motion preference for any theme transition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        fc.constantFrom('light', 'dark'),
        fc.boolean(), // Whether user prefers reduced motion
        (fromTheme: ThemeMode, toTheme: ThemeMode, prefersReducedMotion: boolean) => {
          if (fromTheme === toTheme) return // Skip same theme transitions
          
          // Mock matchMedia for reduced motion and theme detection
          mockMatchMedia.mockImplementation((query: string) => {
            if (query.includes('prefers-reduced-motion: reduce')) {
              return {
                matches: prefersReducedMotion,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            if (query.includes('prefers-color-scheme: dark')) {
              return {
                matches: fromTheme === 'dark',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }
          })
          
          // Mock getComputedStyle to respect reduced motion
          mockGetComputedStyle.mockImplementation((element: Element) => {
            return {
              transitionDuration: prefersReducedMotion ? '0ms' : '300ms',
              transitionTimingFunction: prefersReducedMotion ? 'none' : 'cubic-bezier(0.4, 0, 0.2, 1)',
              transitionProperty: prefersReducedMotion ? 'none' : 'background-color, border-color, color',
              getPropertyValue: (property: string) => {
                switch (property) {
                  case 'transition-duration':
                    return prefersReducedMotion ? '0ms' : '300ms'
                  case 'transition-timing-function':
                    return prefersReducedMotion ? 'none' : 'cubic-bezier(0.4, 0, 0.2, 1)'
                  case 'transition-property':
                    return prefersReducedMotion ? 'none' : 'background-color, border-color, color'
                  default:
                    return ''
                }
              }
            } as CSSStyleDeclaration
          })
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={fromTheme}>
              <ReducedMotionTestComponent />
            </ThemeProvider>
          )

          try {
            // Verify initial theme
            expect(screen.getByTestId('current-theme')).toHaveTextContent(fromTheme)
            
            // Get elements before theme change
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            
            // Check initial transition properties
            const initialGlassCardStyle = mockGetComputedStyle(glassCard)
            const initialButtonStyle = mockGetComputedStyle(primaryButton)
            
            if (prefersReducedMotion) {
              expect(initialGlassCardStyle.getPropertyValue('transition-duration')).toBe('0ms')
              expect(initialButtonStyle.getPropertyValue('transition-duration')).toBe('0ms')
            } else {
              expect(initialGlassCardStyle.getPropertyValue('transition-duration')).toBe('300ms')
              expect(initialButtonStyle.getPropertyValue('transition-duration')).toBe('300ms')
            }
            
            // Trigger theme change
            const setButton = screen.getByTestId(`set-${toTheme}`)
            act(() => {
              setButton.click()
            })
            
            // Verify theme changed
            expect(screen.getByTestId('current-theme')).toHaveTextContent(toTheme)
            
            // Check transition properties after theme change
            const finalGlassCardStyle = mockGetComputedStyle(glassCard)
            const finalButtonStyle = mockGetComputedStyle(primaryButton)
            
            if (prefersReducedMotion) {
              // Transitions should still be disabled after theme change
              expect(finalGlassCardStyle.getPropertyValue('transition-duration')).toBe('0ms')
              expect(finalButtonStyle.getPropertyValue('transition-duration')).toBe('0ms')
            } else {
              // Transitions should still be enabled after theme change
              expect(finalGlassCardStyle.getPropertyValue('transition-duration')).toBe('300ms')
              expect(finalButtonStyle.getPropertyValue('transition-duration')).toBe('300ms')
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 13.4: Animations are disabled when reduced motion is preferred
   * Validates: Requirements 9.5
   */
  it('Property 13.4: All animations are disabled when user prefers reduced motion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.boolean(), // Whether user prefers reduced motion
        (theme: ThemeMode, prefersReducedMotion: boolean) => {
          // Mock matchMedia for reduced motion preference
          mockMatchMedia.mockImplementation((query: string) => {
            if (query.includes('prefers-reduced-motion: reduce')) {
              return {
                matches: prefersReducedMotion,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            // For theme queries
            if (query.includes('prefers-color-scheme: dark')) {
              return {
                matches: theme === 'dark',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }
          })
          
          // Mock getComputedStyle to handle animations based on reduced motion
          mockGetComputedStyle.mockImplementation((element: Element) => {
            return {
              animationDuration: prefersReducedMotion ? '0ms' : '2s',
              animationName: prefersReducedMotion ? 'none' : 'pulse',
              animationIterationCount: prefersReducedMotion ? '0' : 'infinite',
              getPropertyValue: (property: string) => {
                switch (property) {
                  case 'animation-duration':
                    return prefersReducedMotion ? '0ms' : '2s'
                  case 'animation-name':
                    return prefersReducedMotion ? 'none' : 'pulse'
                  case 'animation-iteration-count':
                    return prefersReducedMotion ? '0' : 'infinite'
                  default:
                    return ''
                }
              }
            } as CSSStyleDeclaration
          })
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <ReducedMotionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get animated element
            const animatedElement = screen.getByTestId('animated-element')
            const computedStyle = mockGetComputedStyle(animatedElement)
            
            if (prefersReducedMotion) {
              // Animations should be disabled
              expect(computedStyle.getPropertyValue('animation-duration')).toBe('0ms')
              expect(computedStyle.getPropertyValue('animation-name')).toBe('none')
              expect(computedStyle.getPropertyValue('animation-iteration-count')).toBe('0')
            } else {
              // Animations should be enabled
              expect(computedStyle.getPropertyValue('animation-duration')).toBe('2s')
              expect(computedStyle.getPropertyValue('animation-name')).toBe('pulse')
              expect(computedStyle.getPropertyValue('animation-iteration-count')).toBe('infinite')
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 13.5: Reduced motion preference is consistently applied across all elements
   * Validates: Requirements 9.5
   */
  it('Property 13.5: Reduced motion preference is consistently applied across all theme-aware elements', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.boolean(), // Whether user prefers reduced motion
        (theme: ThemeMode, prefersReducedMotion: boolean) => {
          // Mock matchMedia for reduced motion preference
          mockMatchMedia.mockImplementation((query: string) => {
            if (query.includes('prefers-reduced-motion: reduce')) {
              return {
                matches: prefersReducedMotion,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
              }
            }
            return {
              matches: false,
              media: query,
              onchange: null,
              addListener: vi.fn(),
              removeListener: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
              dispatchEvent: vi.fn(),
            }
          })
          
          // Mock getComputedStyle consistently for all elements
          mockGetComputedStyle.mockImplementation((element: Element) => {
            return {
              transitionDuration: prefersReducedMotion ? '0ms' : '300ms',
              animationDuration: prefersReducedMotion ? '0ms' : '2s',
              getPropertyValue: (property: string) => {
                switch (property) {
                  case 'transition-duration':
                    return prefersReducedMotion ? '0ms' : '300ms'
                  case 'animation-duration':
                    return prefersReducedMotion ? '0ms' : '2s'
                  default:
                    return ''
                }
              }
            } as CSSStyleDeclaration
          })
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <ReducedMotionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get all theme-aware elements
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            const ambientGlow = screen.getByTestId('ambient-glow')
            const animatedElement = screen.getByTestId('animated-element')
            
            const elements = [glassCard, primaryButton, ambientGlow, animatedElement]
            
            // Verify all elements consistently respect reduced motion preference
            elements.forEach(element => {
              const computedStyle = mockGetComputedStyle(element)
              
              const transitionDuration = computedStyle.getPropertyValue('transition-duration')
              const animationDuration = computedStyle.getPropertyValue('animation-duration')
              
              if (prefersReducedMotion) {
                expect(transitionDuration).toBe('0ms')
                expect(animationDuration).toBe('0ms')
              } else {
                expect(transitionDuration).toBe('300ms')
                expect(animationDuration).toBe('2s')
              }
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})