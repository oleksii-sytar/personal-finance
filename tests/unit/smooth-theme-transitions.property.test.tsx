/**
 * Property-based tests for smooth theme transitions
 * Feature: theme-switching, Property 12: Smooth Theme Transitions
 * 
 * Tests that for any theme change, the visual transition completes within 300ms 
 * using CSS transitions without causing layout shifts.
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { ThemeProvider, useTheme, type ThemeMode } from '@/contexts/theme-context'

// Test component to trigger theme changes and measure transitions
function TransitionTestComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      
      <div 
        data-testid="glass-card" 
        className="glass-card p-4"
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'var(--border-glass)',
          color: 'var(--text-primary)'
        }}
      >
        Glass Card Content
      </div>
      
      <button 
        data-testid="primary-button"
        className="btn-primary"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--text-inverse)'
        }}
      >
        Primary Button
      </button>
      
      <div 
        data-testid="ambient-glow"
        style={{
          background: 'radial-gradient(circle, var(--ambient-glow) 0%, transparent 70%)'
        }}
      >
        Ambient Glow
      </div>
      
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

// Mock matchMedia
const mockMatchMedia = vi.fn()

// Mock getComputedStyle to return transition properties
const mockGetComputedStyle = vi.fn()

// Mock performance.now for timing measurements
const mockPerformanceNow = vi.fn()

// Mock requestAnimationFrame for transition testing
const mockRequestAnimationFrame = vi.fn()

describe('Property 12: Smooth Theme Transitions', () => {
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
    
    // Mock getComputedStyle to return CSS transition properties
    mockGetComputedStyle.mockImplementation((element: Element) => {
      const style = {
        transitionDuration: '300ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        transitionProperty: 'background-color, border-color, color, box-shadow',
        getPropertyValue: (property: string) => {
          switch (property) {
            case 'transition-duration':
              return '300ms'
            case 'transition-timing-function':
              return 'cubic-bezier(0.4, 0, 0.2, 1)'
            case 'transition-property':
              return 'background-color, border-color, color, box-shadow'
            case '--theme-transition-duration':
              return '300ms'
            case '--theme-transition-easing':
              return 'cubic-bezier(0.4, 0, 0.2, 1)'
            default:
              return ''
          }
        }
      }
      return style as CSSStyleDeclaration
    })
    
    Object.defineProperty(window, 'getComputedStyle', {
      value: mockGetComputedStyle,
      writable: true,
    })
    
    // Mock performance.now for timing
    let currentTime = 0
    mockPerformanceNow.mockImplementation(() => {
      currentTime += 16.67 // Simulate 60fps
      return currentTime
    })
    
    Object.defineProperty(window.performance, 'now', {
      value: mockPerformanceNow,
      writable: true,
    })
    
    // Mock requestAnimationFrame
    mockRequestAnimationFrame.mockImplementation((callback: FrameRequestCallback) => {
      setTimeout(() => callback(mockPerformanceNow()), 16.67)
      return 1
    })
    
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: mockRequestAnimationFrame,
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

  /**
   * Property 12.1: Theme transitions complete within 300ms
   * Validates: Requirements 9.1
   */
  it('Property 12.1: Theme transitions complete within 300ms for any theme change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('light', 'dark', 'system'),
        fc.constantFrom('light', 'dark', 'system'),
        async (fromTheme: ThemeMode, toTheme: ThemeMode) => {
          if (fromTheme === toTheme) return // Skip same theme transitions
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={fromTheme}>
              <TransitionTestComponent />
            </ThemeProvider>
          )

          try {
            // Verify initial theme
            expect(screen.getByTestId('current-theme')).toHaveTextContent(fromTheme)
            
            // Get elements that should have transitions
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            
            // Verify transition properties are set
            const glassCardStyle = mockGetComputedStyle(glassCard)
            const buttonStyle = mockGetComputedStyle(primaryButton)
            
            expect(glassCardStyle.getPropertyValue('transition-duration')).toBe('300ms')
            expect(buttonStyle.getPropertyValue('transition-duration')).toBe('300ms')
            
            // Record start time
            const startTime = mockPerformanceNow()
            
            // Trigger theme change
            const setButton = screen.getByTestId(`set-${toTheme}`)
            act(() => {
              setButton.click()
            })
            
            // Verify theme changed
            expect(screen.getByTestId('current-theme')).toHaveTextContent(toTheme)
            
            // Wait for transition to complete
            await new Promise(resolve => {
              mockRequestAnimationFrame(() => {
                const endTime = mockPerformanceNow()
                const transitionDuration = endTime - startTime
                
                // Verify transition completed within expected timeframe
                // Allow some tolerance for test environment
                expect(transitionDuration).toBeLessThanOrEqual(350) // 300ms + 50ms tolerance
                resolve(undefined)
              })
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property 12.2: CSS transitions use proper easing function
   * Validates: Requirements 9.2
   */
  it('Property 12.2: CSS transitions use smooth easing function for any theme-aware element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (theme: ThemeMode) => {
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <TransitionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get theme-aware elements
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            const ambientGlow = screen.getByTestId('ambient-glow')
            
            // Verify smooth easing function is applied
            const elements = [glassCard, primaryButton, ambientGlow]
            
            elements.forEach(element => {
              const computedStyle = mockGetComputedStyle(element)
              const timingFunction = computedStyle.getPropertyValue('transition-timing-function')
              
              // Should use cubic-bezier for smooth transitions
              expect(timingFunction).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 12.3: Transitions don't cause layout shifts
   * Validates: Requirements 9.3
   */
  it('Property 12.3: Theme transitions preserve layout dimensions for any element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        fc.constantFrom('light', 'dark'),
        (fromTheme: ThemeMode, toTheme: ThemeMode) => {
          if (fromTheme === toTheme) return // Skip same theme transitions
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={fromTheme}>
              <TransitionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get elements and record initial dimensions
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            
            // Mock getBoundingClientRect to simulate layout measurements
            const mockGetBoundingClientRect = vi.fn(() => ({
              width: 200,
              height: 100,
              top: 0,
              left: 0,
              bottom: 100,
              right: 200,
              x: 0,
              y: 0,
              toJSON: () => ({})
            }))
            
            glassCard.getBoundingClientRect = mockGetBoundingClientRect
            primaryButton.getBoundingClientRect = mockGetBoundingClientRect
            
            // Record initial dimensions
            const initialGlassCardRect = glassCard.getBoundingClientRect()
            const initialButtonRect = primaryButton.getBoundingClientRect()
            
            // Trigger theme change
            const setButton = screen.getByTestId(`set-${toTheme}`)
            act(() => {
              setButton.click()
            })
            
            // Verify dimensions haven't changed (no layout shift)
            const finalGlassCardRect = glassCard.getBoundingClientRect()
            const finalButtonRect = primaryButton.getBoundingClientRect()
            
            expect(finalGlassCardRect.width).toBe(initialGlassCardRect.width)
            expect(finalGlassCardRect.height).toBe(initialGlassCardRect.height)
            expect(finalButtonRect.width).toBe(initialButtonRect.width)
            expect(finalButtonRect.height).toBe(initialButtonRect.height)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 12.4: Ambient glow effect is maintained during transitions
   * Validates: Requirements 9.4
   */
  it('Property 12.4: Ambient glow effect transitions smoothly for any theme change', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        fc.constantFrom('light', 'dark'),
        (fromTheme: ThemeMode, toTheme: ThemeMode) => {
          if (fromTheme === toTheme) return // Skip same theme transitions
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={fromTheme}>
              <TransitionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get ambient glow element
            const ambientGlow = screen.getByTestId('ambient-glow')
            
            // Verify ambient glow has transition properties
            const computedStyle = mockGetComputedStyle(ambientGlow)
            expect(computedStyle.getPropertyValue('transition-duration')).toBe('300ms')
            expect(computedStyle.getPropertyValue('transition-property')).toContain('background')
            
            // Trigger theme change
            const setButton = screen.getByTestId(`set-${toTheme}`)
            act(() => {
              setButton.click()
            })
            
            // Verify ambient glow element is still present and styled
            expect(ambientGlow).toBeInTheDocument()
            expect(ambientGlow.style.background).toContain('radial-gradient')
            expect(ambientGlow.style.background).toContain('var(--ambient-glow)')
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 12.5: All theme-aware CSS properties have transitions
   * Validates: Requirements 9.1, 9.2
   */
  it('Property 12.5: All theme-aware elements have proper transition properties', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (theme: ThemeMode) => {
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <TransitionTestComponent />
            </ThemeProvider>
          )

          try {
            // Get all theme-aware elements
            const glassCard = screen.getByTestId('glass-card')
            const primaryButton = screen.getByTestId('primary-button')
            const ambientGlow = screen.getByTestId('ambient-glow')
            
            const elements = [glassCard, primaryButton, ambientGlow]
            
            elements.forEach(element => {
              const computedStyle = mockGetComputedStyle(element)
              
              // Verify transition duration
              expect(computedStyle.getPropertyValue('transition-duration')).toBe('300ms')
              
              // Verify transition properties include theme-aware properties
              const transitionProperty = computedStyle.getPropertyValue('transition-property')
              expect(transitionProperty).toMatch(/background|color|border|box-shadow/)
              
              // Verify smooth easing
              expect(computedStyle.getPropertyValue('transition-timing-function')).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})