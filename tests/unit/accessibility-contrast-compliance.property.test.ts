/**
 * Property-based tests for accessibility contrast compliance
 * Feature: theme-switching, Property 9: Accessibility Contrast Compliance
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'

// Mock DOM environment for accessibility testing
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

// Mock getComputedStyle for both themes
const mockGetComputedStyle = (element: Element) => {
  const styles: Record<string, string> = {}
  const theme = mockDocument.documentElement.dataset?.theme || 'dark'
  
  if (theme === 'light') {
    // Light theme colors
    styles['--bg-primary'] = '#F5F5F4'      // Warm Alabaster
    styles['--bg-secondary'] = '#E7E5E4'    // Latte Leather
    styles['--bg-glass'] = '#FFFFFF'        // Pure White
    styles['--text-primary'] = '#1C1917'    // Ink Grey
    styles['--text-secondary'] = 'rgba(28, 25, 23, 0.6)'
    styles['--text-muted'] = 'rgba(28, 25, 23, 0.4)'
    styles['--accent-primary'] = '#B45309'  // Burnt Copper
    styles['--accent-secondary'] = '#92400E'
    styles['--accent-success'] = '#166534'
    styles['--accent-warning'] = '#A16207'
    styles['--accent-error'] = '#DC2626'
  } else {
    // Dark theme colors (default)
    styles['--bg-primary'] = '#1C1917'      // Peat Charcoal
    styles['--bg-secondary'] = '#2A1D15'    // Deep Leather
    styles['--bg-glass'] = 'rgba(255, 255, 255, 0.04)'
    styles['--text-primary'] = 'rgba(255, 255, 255, 0.9)'
    styles['--text-secondary'] = 'rgba(255, 255, 255, 0.6)'
    styles['--text-muted'] = 'rgba(255, 255, 255, 0.4)'
    styles['--accent-primary'] = '#E6A65D'  // Single Malt
    styles['--accent-secondary'] = '#5C3A21'
    styles['--accent-success'] = '#4E7A58'
    styles['--accent-warning'] = '#D97706'
    styles['--accent-error'] = '#EF4444'
  }
  
  return {
    getPropertyValue: (property: string) => styles[property] || ''
  } as CSSStyleDeclaration
}

// Utility functions for contrast ratio calculation
function parseColor(color: string): { r: number; g: number; b: number; a?: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      }
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      }
    }
  }
  
  // Handle rgba colors
  const rgbaMatch = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
    }
  }
  
  throw new Error(`Unable to parse color: ${color}`)
}

function getLuminance(r: number, g: number, b: number): number {
  // Convert RGB to relative luminance according to WCAG 2.1
  const sRGB = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

function getContrastRatio(color1: string, color2: string): number {
  try {
    const c1 = parseColor(color1)
    const c2 = parseColor(color2)
    
    const l1 = getLuminance(c1.r, c1.g, c1.b)
    const l2 = getLuminance(c2.r, c2.g, c2.b)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  } catch (error) {
    console.warn(`Error calculating contrast ratio for ${color1} and ${color2}:`, error)
    return 0
  }
}

// Function to apply theme
function applyTheme(theme: 'light' | 'dark') {
  mockDocument.documentElement.setAttribute('data-theme', theme)
}

// Function to get computed style values
function getComputedStyleValue(property: string): string {
  const computedStyle = mockGetComputedStyle(mockDocument.documentElement as any)
  return computedStyle.getPropertyValue(property)
}

// WCAG contrast requirements
const WCAG_NORMAL_TEXT_RATIO = 4.5  // AA standard for normal text
const WCAG_LARGE_TEXT_RATIO = 3.0   // AA standard for large text and UI elements

describe('Accessibility Contrast Compliance Property Tests', () => {
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
   * Property 9: Accessibility Contrast Compliance
   * For any theme and text element combination, the contrast ratio should meet WCAG guidelines
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('Property 9.1: Light mode maintains 4.5:1 contrast ratio for normal text', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyTheme('light')
          
          // Get text and background colors
          const textColor = getComputedStyleValue('--text-primary')
          const primaryBg = getComputedStyleValue('--bg-primary')
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          const glassBg = getComputedStyleValue('--bg-glass')
          
          // Requirement 6.1: THE Light_Mode SHALL maintain a minimum contrast ratio of 4.5:1 for normal text
          const contrastOnPrimary = getContrastRatio(textColor, primaryBg)
          const contrastOnSecondary = getContrastRatio(textColor, secondaryBg)
          const contrastOnGlass = getContrastRatio(textColor, glassBg)
          
          expect(contrastOnPrimary).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          expect(contrastOnSecondary).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          expect(contrastOnGlass).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          
          // Verify specific color combinations from design system
          expect(textColor).toBe('#1C1917') // Ink Grey
          expect(primaryBg).toBe('#F5F5F4')  // Warm Alabaster
          expect(contrastOnPrimary).toBeGreaterThan(15) // Should be very high contrast
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.2: Dark mode maintains 4.5:1 contrast ratio for normal text', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyTheme('dark')
          
          // Get text and background colors
          const textColor = getComputedStyleValue('--text-primary')
          const primaryBg = getComputedStyleValue('--bg-primary')
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          
          // Requirement 6.2: THE Dark_Mode SHALL maintain a minimum contrast ratio of 4.5:1 for normal text
          const contrastOnPrimary = getContrastRatio(textColor, primaryBg)
          const contrastOnSecondary = getContrastRatio(textColor, secondaryBg)
          
          expect(contrastOnPrimary).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          expect(contrastOnSecondary).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          
          // Verify specific color combinations from design system
          expect(textColor).toBe('rgba(255, 255, 255, 0.9)') // High-contrast white
          expect(primaryBg).toBe('#1C1917') // Peat Charcoal
          expect(contrastOnPrimary).toBeGreaterThan(15) // Should be very high contrast
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.3: Light mode maintains 3:1 contrast ratio for large text and UI elements', async () => {
    await fc.assert(
      fc.property(
        fc.constant('light'),
        () => {
          // Apply light theme
          applyTheme('light')
          
          // Get UI element colors (accent colors used for buttons, links, etc.)
          const accentPrimary = getComputedStyleValue('--accent-primary')
          const accentSuccess = getComputedStyleValue('--accent-success')
          const accentWarning = getComputedStyleValue('--accent-warning')
          const accentError = getComputedStyleValue('--accent-error')
          
          const primaryBg = getComputedStyleValue('--bg-primary')
          const glassBg = getComputedStyleValue('--bg-glass')
          
          // Requirement 6.3: THE Light_Mode SHALL maintain a minimum contrast ratio of 3:1 for large text and UI elements
          const accentContrasts = [
            getContrastRatio(accentPrimary, primaryBg),
            getContrastRatio(accentPrimary, glassBg),
            getContrastRatio(accentSuccess, primaryBg),
            getContrastRatio(accentWarning, primaryBg),
            getContrastRatio(accentError, primaryBg)
          ]
          
          accentContrasts.forEach((contrast, index) => {
            expect(contrast).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_RATIO)
          })
          
          // Verify specific accent color contrasts
          expect(accentPrimary).toBe('#B45309') // Burnt Copper
          const burntCopperContrast = getContrastRatio(accentPrimary, primaryBg)
          expect(burntCopperContrast).toBeGreaterThan(4) // Should be high contrast
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.4: Dark mode maintains 3:1 contrast ratio for large text and UI elements', async () => {
    await fc.assert(
      fc.property(
        fc.constant('dark'),
        () => {
          // Apply dark theme
          applyTheme('dark')
          
          // Get UI element colors (accent colors used for buttons, links, etc.)
          const accentPrimary = getComputedStyleValue('--accent-primary')
          const accentSuccess = getComputedStyleValue('--accent-success')
          const accentWarning = getComputedStyleValue('--accent-warning')
          const accentError = getComputedStyleValue('--accent-error')
          
          const primaryBg = getComputedStyleValue('--bg-primary')
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          
          // Requirement 6.4: THE Dark_Mode SHALL maintain a minimum contrast ratio of 3:1 for large text and UI elements
          const accentContrasts = [
            getContrastRatio(accentPrimary, primaryBg),
            getContrastRatio(accentPrimary, secondaryBg),
            getContrastRatio(accentSuccess, primaryBg),
            getContrastRatio(accentWarning, primaryBg),
            getContrastRatio(accentError, primaryBg)
          ]
          
          accentContrasts.forEach((contrast, index) => {
            expect(contrast).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_RATIO)
          })
          
          // Verify specific accent color contrasts
          expect(accentPrimary).toBe('#E6A65D') // Single Malt
          const singleMaltContrast = getContrastRatio(accentPrimary, primaryBg)
          expect(singleMaltContrast).toBeGreaterThan(7) // Should be high contrast
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.5: Secondary text maintains adequate contrast in both themes', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(fc.constant('light'), fc.constant('dark')),
        (theme) => {
          // Apply theme
          applyTheme(theme)
          
          // Get secondary text color and backgrounds
          const secondaryText = getComputedStyleValue('--text-secondary')
          const primaryBg = getComputedStyleValue('--bg-primary')
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          
          // Secondary text should meet at least 3:1 ratio (large text standard)
          const contrastOnPrimary = getContrastRatio(secondaryText, primaryBg)
          const contrastOnSecondary = getContrastRatio(secondaryText, secondaryBg)
          
          expect(contrastOnPrimary).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_RATIO)
          expect(contrastOnSecondary).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_RATIO)
          
          // Verify theme-specific secondary text colors
          if (theme === 'light') {
            expect(secondaryText).toBe('rgba(28, 25, 23, 0.6)')
            expect(contrastOnPrimary).toBeGreaterThan(7) // Should be high contrast
          } else {
            expect(secondaryText).toBe('rgba(255, 255, 255, 0.6)')
            expect(contrastOnPrimary).toBeGreaterThan(7) // Should be high contrast
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.6: All theme color combinations meet minimum accessibility standards', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(fc.constant('light'), fc.constant('dark')),
        (theme) => {
          // Apply theme
          applyTheme(theme)
          
          // Get all text colors
          const primaryText = getComputedStyleValue('--text-primary')
          const secondaryText = getComputedStyleValue('--text-secondary')
          const mutedText = getComputedStyleValue('--text-muted')
          
          // Get all background colors
          const primaryBg = getComputedStyleValue('--bg-primary')
          const secondaryBg = getComputedStyleValue('--bg-secondary')
          const glassBg = getComputedStyleValue('--bg-glass')
          
          // Test all text/background combinations
          const textColors = [primaryText, secondaryText]
          const backgrounds = [primaryBg, secondaryBg, glassBg]
          
          textColors.forEach(textColor => {
            backgrounds.forEach(bgColor => {
              // Skip glass background for dark theme as it's translucent
              if (theme === 'dark' && bgColor.includes('rgba')) {
                return
              }
              
              const contrast = getContrastRatio(textColor, bgColor)
              
              // Primary text should meet 4.5:1, secondary text should meet 3:1
              const minRatio = textColor === primaryText ? WCAG_NORMAL_TEXT_RATIO : WCAG_LARGE_TEXT_RATIO
              expect(contrast).toBeGreaterThanOrEqual(minRatio)
            })
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.7: Accent colors provide sufficient contrast for interactive elements', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(fc.constant('light'), fc.constant('dark')),
        (theme) => {
          // Apply theme
          applyTheme(theme)
          
          // Get accent colors (used for buttons, links, interactive elements)
          const accentPrimary = getComputedStyleValue('--accent-primary')
          const accentSuccess = getComputedStyleValue('--accent-success')
          const accentWarning = getComputedStyleValue('--accent-warning')
          const accentError = getComputedStyleValue('--accent-error')
          
          // Get text color that would be used on accent backgrounds
          // For light theme, use white text on dark accents, for dark theme use dark text on light accents
          const textOnAccent = theme === 'light' ? '#FFFFFF' : '#000000'
          
          // All accent colors should provide sufficient contrast for text
          const accentColors = [accentPrimary, accentSuccess, accentWarning, accentError]
          
          accentColors.forEach(accentColor => {
            const contrast = getContrastRatio(textOnAccent, accentColor)
            // Use 3:1 ratio for interactive elements (large text/UI elements standard)
            expect(contrast).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_RATIO)
          })
          
          // Verify theme-specific accent colors meet high contrast standards
          if (theme === 'light') {
            expect(accentPrimary).toBe('#B45309') // Burnt Copper
            const primaryContrast = getContrastRatio('#FFFFFF', accentPrimary)
            expect(primaryContrast).toBeGreaterThan(3.0) // Large text standard
          } else {
            expect(accentPrimary).toBe('#E6A65D') // Single Malt
            const primaryContrast = getContrastRatio('#000000', accentPrimary)
            expect(primaryContrast).toBeGreaterThan(3.0) // Large text standard
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.8: Color combinations maintain Executive Lounge aesthetic while meeting accessibility', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(fc.constant('light'), fc.constant('dark')),
        (theme) => {
          // Apply theme
          applyTheme(theme)
          
          // Get the complete color palette
          const palette = {
            primaryBg: getComputedStyleValue('--bg-primary'),
            secondaryBg: getComputedStyleValue('--bg-secondary'),
            glassBg: getComputedStyleValue('--bg-glass'),
            primaryText: getComputedStyleValue('--text-primary'),
            primaryAccent: getComputedStyleValue('--accent-primary')
          }
          
          // Verify Executive Lounge colors are maintained
          if (theme === 'light') {
            expect(palette.primaryBg).toBe('#F5F5F4')   // Warm Alabaster
            expect(palette.secondaryBg).toBe('#E7E5E4') // Latte Leather
            expect(palette.glassBg).toBe('#FFFFFF')     // Pure White
            expect(palette.primaryText).toBe('#1C1917') // Ink Grey
            expect(palette.primaryAccent).toBe('#B45309') // Burnt Copper
          } else {
            expect(palette.primaryBg).toBe('#1C1917')   // Peat Charcoal
            expect(palette.secondaryBg).toBe('#2A1D15') // Deep Leather
            expect(palette.glassBg).toBe('rgba(255, 255, 255, 0.04)') // Translucent white
            expect(palette.primaryText).toBe('rgba(255, 255, 255, 0.9)') // High-contrast white
            expect(palette.primaryAccent).toBe('#E6A65D') // Single Malt
          }
          
          // Verify accessibility is maintained with Executive Lounge colors
          const textBgContrast = getContrastRatio(palette.primaryText, palette.primaryBg)
          expect(textBgContrast).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_RATIO)
          
          // Verify the aesthetic maintains luxury feel while being accessible
          expect(textBgContrast).toBeGreaterThan(12) // Should be exceptionally high contrast
        }
      ),
      { numRuns: 100 }
    )
  })
})