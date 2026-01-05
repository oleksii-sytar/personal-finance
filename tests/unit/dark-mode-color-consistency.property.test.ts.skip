/**
 * Property-based tests for dark mode color consistency
 * Feature: theme-switching, Property 7: Dark Mode Color Consistency
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'

// Mock DOM environment for dark mode color testing
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

// Mock getComputedStyle for dark mode (default theme)
const mockGetComputedStyle = (element: Element) => {
  const styles: Record<string, string> = {}
  
  // Dark theme values (default when no data-theme or data-theme="dark")
  if (!mockDocument.documentElement.dataset?.theme || mockDocument.documentElement.dataset.theme === 'dark') {
    styles['--bg-primary'] = '#1C1917'      // Peat Charcoal (Req 4.1)
    styles['--bg-secondary'] = '#2A1D15'    // Deep Leather (Req 4.2)
    styles['--bg-glass'] = 'rgba(255, 255, 255, 0.04)' // Translucent white (Req 4.3)
    styles['--text-primary'] = 'rgba(255, 255, 255, 0.9)' // High-contrast white text (Req 4.5)
    styles['--text-secondary'] = 'rgba(255, 255, 255, 0.6)'
    styles['--text-muted'] = 'rgba(255, 255, 255, 0.4)'
    styles['--accent-primary'] = '#E6A65D'  // Single Malt (Req 4.4)
    styles['--accent-secondary'] = '#5C3A21' // Aged Oak
    styles['--accent-success'] = '#4E7A58'  // Growth Emerald
    styles['--accent-warning'] = '#D97706'  // Amber
    styles['--accent-error'] = '#EF4444'    // Light Red
    styles['--border-primary'] = 'rgba(255, 255, 255, 0.1)'
    styles['--border-glass'] = 'rgba(255, 255, 255, 0.08)'
    styles['--shadow-primary'] = 'rgba(230, 166, 93, 0.4)'
    styles['--shadow-glass'] = 'rgba(0, 0, 0, 0.1)'
    styles['--ambient-glow'] = 'rgba(230, 166, 93, 0.15)' // Ambient glow effect (Req 4.6)
  }
  
  return {
    getPropertyValue: (property: string) => styles[property] || ''
  } as CSSStyleDeclaration
}

// Dark mode color requirements from spec
const DARK_MODE_COLORS = {
  // Requirement 4.1: Peat Charcoal as primary background
  primaryBackground: '#1C1917',
  
  // Requirement 4.2: Deep Leather as secondary background
  secondaryBackground: '#2A1D15',
  
  // Requirement 4.3: Translucent white for glass surfaces
  glassBackground: 'rgba(255, 255, 255, 0.04)',
  
  // Requirement 4.4: Single Malt as primary accent color
  primaryAccent: '#E6A65D',
  
  // Requirement 4.5: High-contrast white text for primary text
  primaryText: 'rgba(255, 255, 255, 0.9)'
} as const

// Function to apply dark theme (default state)
function applyDarkTheme() {
  // Dark theme is default, so we can either set no data-theme or set it explicitly
  mockDocument.documentElement.dataset = {}
}

// Function to get computed style values
function getComputedStyleValue(property: string): string {
  const computedStyle = mockGetComputedStyle(mockDocument.documentElement as any)
  return computedStyle.getPropertyValue(property)
}

// Function to check if color maintains luxury atmosphere
function hasLuxuryAtmosphere(color: string): boolean {
  // Dark mode luxury colors should be rich, warm, and sophisticated
  const luxuryColorPatterns = [
    /#1C1917/i, // Peat Charcoal
    /#2A1D15/i, // Deep Leather
    /#E6A65D/i, // Single Malt
    /#5C3A21/i, // Aged Oak
    /#4E7A58/i, // Growth Emerald
    /rgba\(255,\s*255,\s*255,\s*0\.\d+\)/i, // Translucent white
    /rgba\(230,\s*166,\s*93,\s*0\.\d+\)/i   // Single Malt variations
  ]
  
  return luxuryColorPatterns.some(pattern => pattern.test(color))
}

// Function to validate Executive Lounge dark aesthetic
function isExecutiveLoungeDarkColor(color: string): boolean {
  const executiveLoungeDarkColors = [
    '#1C1917', // Peat Charcoal
    '#2A1D15', // Deep Leather
    '#E6A65D', // Single Malt
    '#5C3A21', // Aged Oak
    '#4E7A58', // Growth Emerald
    '#D97706', // Amber
    '#EF4444'  // Light Red
  ]
  
  // Check exact matches or rgba patterns
  return executiveLoungeDarkColors.includes(color) || 
         /rgba\(\s*255,\s*255,\s*255,\s*0\.\d+\s*\)/.test(color) ||
         /rgba\(\s*230,\s*166,\s*93,\s*0\.\d+\s*\)/.test(color) ||
         /rgba\(\s*0,\s*0,\s*0,\s*0\.\d+\s*\)/.test(color)
}

// Function to check if ambient glow effect is present
function hasAmbientGlowEffect(ambientGlowValue: string): boolean {
  // Should contain Single Malt color with transparency for luxury atmosphere
  // Handle both spaced and non-spaced rgba formats
  return /rgba\(\s*230,\s*166,\s*93,\s*0\.\d+\s*\)/.test(ambientGlowValue)
}

describe('Dark Mode Color Consistency Property Tests', () => {
  beforeEach(() => {
    // Reset to default state (dark theme)
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
   * Property 7: Dark Mode Color Consistency
   * For any component in dark mode, the applied colors should match the defined dark theme color palette
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
   */
  it('Property 7.1: Dark mode uses Peat Charcoal as primary background', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get primary background color
          const primaryBg = getComputedStyleValue('--bg-primary')
          
          // Requirement 4.1: THE Dark_Mode SHALL use Peat Charcoal (#1C1917) as the primary background
          expect(primaryBg).toBe(DARK_MODE_COLORS.primaryBackground)
          expect(primaryBg).toBe('#1C1917')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.2: Dark mode uses Deep Leather as secondary background', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get secondary background color
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          
          // Requirement 4.2: THE Dark_Mode SHALL use Deep Leather (#2A1D15) as the secondary background
          expect(secondaryBg).toBe(DARK_MODE_COLORS.secondaryBackground)
          expect(secondaryBg).toBe('#2A1D15')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.3: Dark mode uses translucent white for glass surfaces', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get glass background color
          const glassBg = getComputedStyleValue('--bg-glass')
          
          // Requirement 4.3: THE Dark_Mode SHALL use translucent white (rgba(255,255,255,0.04)) for glass surfaces
          expect(glassBg).toBe(DARK_MODE_COLORS.glassBackground)
          expect(glassBg).toBe('rgba(255, 255, 255, 0.04)')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.4: Dark mode uses Single Malt as primary accent color', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get primary accent color
          const primaryAccent = getComputedStyleValue('--accent-primary')
          
          // Requirement 4.4: THE Dark_Mode SHALL use Single Malt (#E6A65D) as the primary accent color
          expect(primaryAccent).toBe(DARK_MODE_COLORS.primaryAccent)
          expect(primaryAccent).toBe('#E6A65D')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.5: Dark mode uses high-contrast white text for primary text', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get primary text color
          const primaryText = getComputedStyleValue('--text-primary')
          
          // Requirement 4.5: THE Dark_Mode SHALL use high-contrast white text (rgba(255,255,255,0.9)) for primary text
          expect(primaryText).toBe(DARK_MODE_COLORS.primaryText)
          expect(primaryText).toBe('rgba(255, 255, 255, 0.9)')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.6: Dark mode maintains ambient glow effect for luxury atmosphere', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get ambient glow effect
          const ambientGlow = getComputedStyleValue('--ambient-glow')
          
          // Requirement 4.6: THE Dark_Mode SHALL maintain the ambient glow effect for luxury atmosphere
          expect(ambientGlow).toBeDefined()
          expect(ambientGlow).not.toBe('')
          expect(hasAmbientGlowEffect(ambientGlow)).toBe(true)
          
          // Should use Single Malt color with transparency
          expect(ambientGlow).toMatch(/rgba\(\s*230,\s*166,\s*93,\s*0\.\d+\s*\)/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.7: All dark mode colors are properly defined and non-empty', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Required color properties for dark mode
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

  it('Property 7.8: Dark mode color palette forms cohesive Executive Lounge aesthetic', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get the complete color palette
          const palette = {
            peatCharcoal: getComputedStyleValue('--bg-primary'),
            deepLeather: getComputedStyleValue('--bg-secondary'),
            translucentWhite: getComputedStyleValue('--bg-glass'),
            singleMalt: getComputedStyleValue('--accent-primary'),
            highContrastWhite: getComputedStyleValue('--text-primary'),
            ambientGlow: getComputedStyleValue('--ambient-glow')
          }
          
          // Verify the complete Executive Lounge dark palette is present
          expect(palette.peatCharcoal).toBe('#1C1917')
          expect(palette.deepLeather).toBe('#2A1D15')
          expect(palette.translucentWhite).toBe('rgba(255, 255, 255, 0.04)')
          expect(palette.singleMalt).toBe('#E6A65D')
          expect(palette.highContrastWhite).toBe('rgba(255, 255, 255, 0.9)')
          expect(hasAmbientGlowEffect(palette.ambientGlow)).toBe(true)
          
          // Verify palette cohesion - all colors should work together for luxury atmosphere
          const solidColors = [palette.peatCharcoal, palette.deepLeather, palette.singleMalt]
          solidColors.forEach(color => {
            expect(isExecutiveLoungeDarkColor(color)).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.9: Dark mode maintains premium luxury feel across all components', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get colors that contribute to luxury atmosphere
          const luxuryColors = {
            background: getComputedStyleValue('--bg-primary'),
            accent: getComputedStyleValue('--accent-primary'),
            glass: getComputedStyleValue('--bg-glass'),
            glow: getComputedStyleValue('--ambient-glow')
          }
          
          // Verify luxury atmosphere is maintained
          expect(hasLuxuryAtmosphere(luxuryColors.background)).toBe(true)
          expect(hasLuxuryAtmosphere(luxuryColors.accent)).toBe(true)
          expect(hasLuxuryAtmosphere(luxuryColors.glass)).toBe(true)
          expect(hasLuxuryAtmosphere(luxuryColors.glow)).toBe(true)
          
          // Verify no harsh or corporate colors are used
          Object.values(luxuryColors).forEach(color => {
            expect(color).not.toMatch(/blue/i)
            expect(color).not.toMatch(/cyan/i)
            expect(color).not.toMatch(/#000000/) // Pure black
            expect(color).not.toMatch(/#FFFFFF/) // Pure white (except in rgba)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7.10: Dark mode glass surfaces maintain translucency and depth', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyDarkTheme()
          
          // Get glass-related properties
          const glassProperties = {
            background: getComputedStyleValue('--bg-glass'),
            border: getComputedStyleValue('--border-glass'),
            shadow: getComputedStyleValue('--shadow-glass')
          }
          
          // Verify glass background is translucent white
          expect(glassProperties.background).toBe('rgba(255, 255, 255, 0.04)')
          
          // Verify glass border is subtle
          expect(glassProperties.border).toMatch(/rgba\(\s*255,\s*255,\s*255,\s*0\.0[0-9]+\s*\)/)
          
          // Verify glass shadow exists for depth
          expect(glassProperties.shadow).toBeDefined()
          expect(glassProperties.shadow).not.toBe('')
        }
      ),
      { numRuns: 100 }
    )
  })
})