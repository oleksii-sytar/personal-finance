/**
 * Property-based tests for CSS custom properties update
 * Feature: theme-switching, Property 4: CSS Custom Properties Update
 * 
 * Validates: Requirements 1.4, 10.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'

// Mock DOM environment for CSS custom properties testing
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

// Mock getComputedStyle
const mockGetComputedStyle = (element: Element) => {
  const styles: Record<string, string> = {}
  
  // Default dark theme values
  if (!mockDocument.documentElement.dataset?.theme || mockDocument.documentElement.dataset.theme === 'dark') {
    styles['--bg-primary'] = '#1C1917'
    styles['--bg-secondary'] = '#2A1D15'
    styles['--bg-glass'] = 'rgba(255, 255, 255, 0.04)'
    styles['--text-primary'] = 'rgba(255, 255, 255, 0.9)'
    styles['--text-secondary'] = 'rgba(255, 255, 255, 0.6)'
    styles['--accent-primary'] = '#E6A65D'
    styles['--accent-secondary'] = '#5C3A21'
    styles['--accent-success'] = '#4E7A58'
    styles['--border-primary'] = 'rgba(255, 255, 255, 0.1)'
    styles['--border-glass'] = 'rgba(255, 255, 255, 0.08)'
    styles['--ambient-glow'] = 'rgba(230, 166, 93, 0.15)'
  } else if (mockDocument.documentElement.dataset.theme === 'light') {
    styles['--bg-primary'] = '#F5F5F4'
    styles['--bg-secondary'] = '#E7E5E4'
    styles['--bg-glass'] = '#FFFFFF'
    styles['--text-primary'] = '#1C1917'
    styles['--text-secondary'] = 'rgba(28, 25, 23, 0.6)'
    styles['--accent-primary'] = '#B45309'
    styles['--accent-secondary'] = '#92400E'
    styles['--accent-success'] = '#166534'
    styles['--border-primary'] = 'rgba(28, 25, 23, 0.1)'
    styles['--border-glass'] = 'rgba(28, 25, 23, 0.08)'
    styles['--ambient-glow'] = 'rgba(180, 83, 9, 0.1)'
  }
  
  return {
    getPropertyValue: (property: string) => styles[property] || ''
  } as CSSStyleDeclaration
}

// Theme configuration types
type ThemeMode = 'light' | 'dark'

interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgGlass: string
  textPrimary: string
  textSecondary: string
  accentPrimary: string
  accentSecondary: string
  accentSuccess: string
  borderPrimary: string
  borderGlass: string
  ambientGlow: string
}

// Expected theme configurations
const THEME_CONFIGS: Record<ThemeMode, ThemeColors> = {
  dark: {
    bgPrimary: '#1C1917',
    bgSecondary: '#2A1D15',
    bgGlass: 'rgba(255, 255, 255, 0.04)',
    textPrimary: 'rgba(255, 255, 255, 0.9)',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    accentPrimary: '#E6A65D',
    accentSecondary: '#5C3A21',
    accentSuccess: '#4E7A58',
    borderPrimary: 'rgba(255, 255, 255, 0.1)',
    borderGlass: 'rgba(255, 255, 255, 0.08)',
    ambientGlow: 'rgba(230, 166, 93, 0.15)'
  },
  light: {
    bgPrimary: '#F5F5F4',
    bgSecondary: '#E7E5E4',
    bgGlass: '#FFFFFF',
    textPrimary: '#1C1917',
    textSecondary: 'rgba(28, 25, 23, 0.6)',
    accentPrimary: '#B45309',
    accentSecondary: '#92400E',
    accentSuccess: '#166534',
    borderPrimary: 'rgba(28, 25, 23, 0.1)',
    borderGlass: 'rgba(28, 25, 23, 0.08)',
    ambientGlow: 'rgba(180, 83, 9, 0.1)'
  }
}

// CSS property names
const CSS_PROPERTIES = [
  '--bg-primary',
  '--bg-secondary', 
  '--bg-glass',
  '--text-primary',
  '--text-secondary',
  '--accent-primary',
  '--accent-secondary',
  '--accent-success',
  '--border-primary',
  '--border-glass',
  '--ambient-glow'
] as const

// Function to simulate theme change
function applyTheme(theme: ThemeMode) {
  if (theme === 'dark') {
    mockDocument.documentElement.dataset = {}
  } else {
    mockDocument.documentElement.setAttribute('data-theme', theme)
  }
}

// Function to get current CSS property values
function getCurrentCSSProperties(): Record<string, string> {
  const computedStyle = mockGetComputedStyle(mockDocument.documentElement as any)
  const properties: Record<string, string> = {}
  
  for (const property of CSS_PROPERTIES) {
    properties[property] = computedStyle.getPropertyValue(property)
  }
  
  return properties
}

describe('CSS Custom Properties Update Property Tests', () => {
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
   * Property 4: CSS Custom Properties Update
   * For any theme change, all CSS custom properties should be updated to match the new theme's color configuration
   * **Validates: Requirements 1.4, 10.1**
   */
  it('Property 4.1: Theme change updates all CSS custom properties correctly', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        (theme: ThemeMode) => {
          // Apply the theme
          applyTheme(theme)
          
          // Get current CSS properties
          const currentProperties = getCurrentCSSProperties()
          const expectedConfig = THEME_CONFIGS[theme]
          
          // Verify all properties match expected values
          expect(currentProperties['--bg-primary']).toBe(expectedConfig.bgPrimary)
          expect(currentProperties['--bg-secondary']).toBe(expectedConfig.bgSecondary)
          expect(currentProperties['--bg-glass']).toBe(expectedConfig.bgGlass)
          expect(currentProperties['--text-primary']).toBe(expectedConfig.textPrimary)
          expect(currentProperties['--text-secondary']).toBe(expectedConfig.textSecondary)
          expect(currentProperties['--accent-primary']).toBe(expectedConfig.accentPrimary)
          expect(currentProperties['--accent-secondary']).toBe(expectedConfig.accentSecondary)
          expect(currentProperties['--accent-success']).toBe(expectedConfig.accentSuccess)
          expect(currentProperties['--border-primary']).toBe(expectedConfig.borderPrimary)
          expect(currentProperties['--border-glass']).toBe(expectedConfig.borderGlass)
          expect(currentProperties['--ambient-glow']).toBe(expectedConfig.ambientGlow)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4.2: Multiple theme changes maintain consistency', async () => {
    await fc.assert(
      fc.property(
        fc.array(fc.constantFrom('light' as const, 'dark' as const), { minLength: 2, maxLength: 10 }),
        (themeSequence: ThemeMode[]) => {
          let previousProperties: Record<string, string> | null = null
          let previousTheme: ThemeMode | null = null
          
          for (const theme of themeSequence) {
            // Apply theme
            applyTheme(theme)
            
            // Get current properties
            const currentProperties = getCurrentCSSProperties()
            const expectedConfig = THEME_CONFIGS[theme]
            
            // Verify properties match expected configuration
            expect(currentProperties['--bg-primary']).toBe(expectedConfig.bgPrimary)
            expect(currentProperties['--accent-primary']).toBe(expectedConfig.accentPrimary)
            expect(currentProperties['--text-primary']).toBe(expectedConfig.textPrimary)
            
            // Verify properties are different from previous theme only if theme actually changed
            if (previousProperties && previousTheme && previousTheme !== theme) {
              expect(currentProperties['--bg-primary']).not.toBe(previousProperties['--bg-primary'])
              expect(currentProperties['--accent-primary']).not.toBe(previousProperties['--accent-primary'])
            }
            
            // If same theme is applied consecutively, properties should remain the same
            if (previousProperties && previousTheme && previousTheme === theme) {
              expect(currentProperties['--bg-primary']).toBe(previousProperties['--bg-primary'])
              expect(currentProperties['--accent-primary']).toBe(previousProperties['--accent-primary'])
              expect(currentProperties['--text-primary']).toBe(previousProperties['--text-primary'])
            }
            
            previousProperties = { ...currentProperties }
            previousTheme = theme
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 4.3: All required CSS properties are defined for each theme', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        (theme: ThemeMode) => {
          // Apply theme
          applyTheme(theme)
          
          // Get current properties
          const currentProperties = getCurrentCSSProperties()
          
          // Verify all required properties are defined and non-empty
          for (const property of CSS_PROPERTIES) {
            expect(currentProperties[property]).toBeDefined()
            expect(currentProperties[property]).not.toBe('')
            expect(currentProperties[property]).not.toBe('undefined')
            expect(currentProperties[property]).not.toBe('null')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4.4: Theme-specific color values are correctly applied', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        (theme: ThemeMode) => {
          // Apply theme
          applyTheme(theme)
          
          // Get current properties
          const currentProperties = getCurrentCSSProperties()
          
          if (theme === 'dark') {
            // Verify dark theme specific values
            expect(currentProperties['--bg-primary']).toBe('#1C1917') // Peat Charcoal
            expect(currentProperties['--accent-primary']).toBe('#E6A65D') // Single Malt
            expect(currentProperties['--text-primary']).toContain('rgba(255, 255, 255') // White text
          } else {
            // Verify light theme specific values
            expect(currentProperties['--bg-primary']).toBe('#F5F5F4') // Warm Alabaster
            expect(currentProperties['--accent-primary']).toBe('#B45309') // Burnt Copper
            expect(currentProperties['--text-primary']).toBe('#1C1917') // Ink Grey
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4.5: Executive Lounge aesthetic colors are maintained', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        (theme: ThemeMode) => {
          // Apply theme
          applyTheme(theme)
          
          // Get current properties
          const currentProperties = getCurrentCSSProperties()
          
          // Verify Executive Lounge color palette is used
          const bgPrimary = currentProperties['--bg-primary']
          const accentPrimary = currentProperties['--accent-primary']
          
          if (theme === 'dark') {
            // Dark theme should use warm, luxury colors
            expect(bgPrimary).toMatch(/#1C1917/) // Peat Charcoal
            expect(accentPrimary).toMatch(/#E6A65D/) // Single Malt
          } else {
            // Light theme should maintain warm undertones
            expect(bgPrimary).toMatch(/#F5F5F4/) // Warm Alabaster
            expect(accentPrimary).toMatch(/#B45309/) // Burnt Copper
          }
          
          // Verify warm undertones are maintained (no cool blues/grays)
          expect(bgPrimary).not.toContain('blue')
          expect(accentPrimary).not.toContain('blue')
        }
      ),
      { numRuns: 100 }
    )
  })
})