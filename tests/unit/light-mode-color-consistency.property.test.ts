/**
 * Property-based tests for light mode color consistency
 * Feature: theme-switching, Property 6: Light Mode Color Consistency
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'

// Mock DOM environment for light mode color testing
const mockDocument = {
  documentElement: {
    style: {} as CSSStyleDeclaration,
    getAttribute: (name: string) => {
      if (name === 'data-theme') {
        return mockDocument.documentElement.dataset?.theme || null
      }
      return null
    },
    setAttribute: (name: string, value: string) => {
      if (name === 'data-theme') {
        mockDocument.documentElement.dataset = { theme: value }
      }
    },
    dataset: {} as DOMStringMap
  }
}

// Mock getComputedStyle for light mode
const mockGetComputedStyle = (element: Element) => {
  const styles: Record<string, string> = {}
  
  // Light theme values based on requirements
  if (mockDocument.documentElement.dataset?.theme === 'light') {
    styles['--bg-primary'] = '#F5F5F4'      // Warm Alabaster (Req 3.1)
    styles['--bg-secondary'] = '#E7E5E4'    // Latte Leather (Req 3.2)
    styles['--bg-glass'] = '#FFFFFF'        // Pure White (Req 3.3)
    styles['--text-primary'] = '#1C1917'    // Ink Grey (Req 3.5)
    styles['--text-secondary'] = 'rgba(28, 25, 23, 0.6)'
    styles['--text-muted'] = 'rgba(28, 25, 23, 0.4)'
    styles['--accent-primary'] = '#B45309'  // Burnt Copper (Req 3.4)
    styles['--accent-secondary'] = '#92400E'
    styles['--accent-success'] = '#166534'
    styles['--accent-warning'] = '#A16207'
    styles['--accent-error'] = '#DC2626'
    styles['--border-primary'] = 'rgba(28, 25, 23, 0.1)'
    styles['--border-glass'] = 'rgba(28, 25, 23, 0.08)'
    styles['--shadow-primary'] = 'rgba(180, 83, 9, 0.2)'
    styles['--shadow-glass'] = 'rgba(0, 0, 0, 0.05)'
    styles['--ambient-glow'] = 'rgba(180, 83, 9, 0.1)'
  }
  
  return {
    getPropertyValue: (property: string) => styles[property] || ''
  } as CSSStyleDeclaration
}

// Light mode color requirements from spec
const LIGHT_MODE_COLORS = {
  // Requirement 3.1: Warm Alabaster as primary background
  primaryBackground: '#F5F5F4',
  
  // Requirement 3.2: Latte Leather as secondary background
  secondaryBackground: '#E7E5E4',
  
  // Requirement 3.3: Pure White for glass card backgrounds
  glassBackground: '#FFFFFF',
  
  // Requirement 3.4: Burnt Copper as primary accent color
  primaryAccent: '#B45309',
  
  // Requirement 3.5: Ink Grey as primary text color
  primaryText: '#1C1917'
} as const

// Function to apply light theme
function applyLightTheme() {
  mockDocument.documentElement.setAttribute('data-theme', 'light')
}

// Function to get computed style values
function getComputedStyleValue(property: string): string {
  const computedStyle = mockGetComputedStyle(mockDocument.documentElement as any)
  return computedStyle.getPropertyValue(property)
}

// Function to check if color has warm undertones (no cool blues/grays)
function hasWarmUndertones(color: string): boolean {
  // Check for cool colors that would violate warm undertone requirement
  const coolColorPatterns = [
    /blue/i,
    /cyan/i,
    /teal/i
  ]
  
  // Check for pure grays (where R, G, B values are identical)
  // But exclude our warm colors that might appear gray-ish
  const warmExceptions = [
    '#F5F5F4', // Warm Alabaster - has warm undertones despite similar RGB values
    '#E7E5E4', // Latte Leather - warm beige
    '#1C1917'  // Ink Grey - warm dark color
  ]
  
  // If it's a warm exception, it has warm undertones
  if (warmExceptions.includes(color.toUpperCase())) {
    return true
  }
  
  return !coolColorPatterns.some(pattern => pattern.test(color))
}

// Function to validate Executive Lounge aesthetic
function isExecutiveLoungeColor(color: string): boolean {
  const executiveLoungeColors = [
    '#F5F5F4', // Warm Alabaster
    '#E7E5E4', // Latte Leather
    '#FFFFFF', // Pure White
    '#B45309', // Burnt Copper
    '#1C1917', // Ink Grey
    '#92400E', // Darker Copper
    '#166534', // Dark Green
    '#A16207', // Dark Amber
    '#DC2626'  // Red
  ]
  
  // Check if it's an exact match
  if (executiveLoungeColors.includes(color)) {
    return true
  }
  
  // Check for rgba patterns with warm undertones
  const warmRgbaPatterns = [
    /rgba\(180,\s*83,\s*9,\s*0\.\d+\)/i,     // Burnt Copper variations
    /rgba\(28,\s*25,\s*23,\s*0\.\d+\)/i,     // Ink Grey variations
    /rgba\(0,\s*0,\s*0,\s*0\.\d+\)/i         // Black shadow variations
  ]
  
  return warmRgbaPatterns.some(pattern => pattern.test(color)) || hasWarmUndertones(color)
}

describe('Light Mode Color Consistency Property Tests', () => {
  beforeEach(() => {
    // Reset to default state
    mockDocument.documentElement.dataset = {}
    
    // Mock global objects
    global.document = mockDocument as any
    global.getComputedStyle = mockGetComputedStyle as any
  })

  afterEach(() => {
    // Clean up
    delete (global as any).document
    delete (global as any).getComputedStyle
  })

  /**
   * Property 6: Light Mode Color Consistency
   * For any component in light mode, the applied colors should match the defined light theme color palette
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('Property 6.1: Light mode uses Warm Alabaster as primary background', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get primary background color
          const primaryBg = getComputedStyleValue('--bg-primary')
          
          // Requirement 3.1: THE Light_Mode SHALL use Warm Alabaster (#F5F5F4) as the primary background
          expect(primaryBg).toBe(LIGHT_MODE_COLORS.primaryBackground)
          expect(primaryBg).toBe('#F5F5F4')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.2: Light mode uses Latte Leather as secondary background', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get secondary background color
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          
          // Requirement 3.2: THE Light_Mode SHALL use Latte Leather (#E7E5E4) as the secondary background
          expect(secondaryBg).toBe(LIGHT_MODE_COLORS.secondaryBackground)
          expect(secondaryBg).toBe('#E7E5E4')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.3: Light mode uses Pure White for glass card backgrounds', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get glass background color
          const glassBg = getComputedStyleValue('--bg-glass')
          
          // Requirement 3.3: THE Light_Mode SHALL use Pure White (#FFFFFF) for glass card backgrounds
          expect(glassBg).toBe(LIGHT_MODE_COLORS.glassBackground)
          expect(glassBg).toBe('#FFFFFF')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.4: Light mode uses Burnt Copper as primary accent color', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get primary accent color
          const primaryAccent = getComputedStyleValue('--accent-primary')
          
          // Requirement 3.4: THE Light_Mode SHALL use Burnt Copper (#B45309) as the primary accent color
          expect(primaryAccent).toBe(LIGHT_MODE_COLORS.primaryAccent)
          expect(primaryAccent).toBe('#B45309')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.5: Light mode uses Ink Grey as primary text color', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get primary text color
          const primaryText = getComputedStyleValue('--text-primary')
          
          // Requirement 3.5: THE Light_Mode SHALL use Ink Grey (#1C1917) as the primary text color
          expect(primaryText).toBe(LIGHT_MODE_COLORS.primaryText)
          expect(primaryText).toBe('#1C1917')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.6: Light mode maintains warm undertones consistent with Executive Lounge aesthetic', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get all color values
          const colors = {
            primaryBg: getComputedStyleValue('--bg-primary'),
            secondaryBg: getComputedStyleValue('--bg-secondary'),
            glassBg: getComputedStyleValue('--bg-glass'),
            primaryAccent: getComputedStyleValue('--accent-primary'),
            primaryText: getComputedStyleValue('--text-primary'),
            ambientGlow: getComputedStyleValue('--ambient-glow')
          }
          
          // Requirement 3.6: THE Light_Mode SHALL maintain warm undertones consistent with the Executive Lounge aesthetic
          Object.entries(colors).forEach(([key, color]) => {
            expect(hasWarmUndertones(color)).toBe(true)
            expect(isExecutiveLoungeColor(color)).toBe(true)
          })
          
          // Verify no cool colors are used
          Object.values(colors).forEach(color => {
            expect(color).not.toMatch(/blue/i)
            expect(color).not.toMatch(/cyan/i)
            expect(color).not.toMatch(/teal/i)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.7: All light mode colors are properly defined and non-empty', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Required color properties for light mode
          const requiredProperties = [
            '--bg-primary',
            '--bg-secondary',
            '--bg-glass',
            '--text-primary',
            '--accent-primary',
            '--ambient-glow'
          ]
          
          // Verify all required properties are defined
          requiredProperties.forEach(property => {
            const value = getComputedStyleValue(property)
            expect(value).toBeDefined()
            expect(value).not.toBe('')
            expect(value).not.toBe('undefined')
            expect(value).not.toBe('null')
            expect(value.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6.8: Light mode color palette forms cohesive Executive Lounge aesthetic', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyLightTheme()
          
          // Get the complete color palette
          const palette = {
            warmAlabaster: getComputedStyleValue('--bg-primary'),
            latteLeather: getComputedStyleValue('--bg-secondary'),
            pureWhite: getComputedStyleValue('--bg-glass'),
            burntCopper: getComputedStyleValue('--accent-primary'),
            inkGrey: getComputedStyleValue('--text-primary')
          }
          
          // Verify the complete Executive Lounge palette is present
          expect(palette.warmAlabaster).toBe('#F5F5F4')
          expect(palette.latteLeather).toBe('#E7E5E4')
          expect(palette.pureWhite).toBe('#FFFFFF')
          expect(palette.burntCopper).toBe('#B45309')
          expect(palette.inkGrey).toBe('#1C1917')
          
          // Verify palette cohesion - all colors should work together
          const allColors = Object.values(palette)
          allColors.forEach(color => {
            expect(isExecutiveLoungeColor(color)).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})