/**
 * @file Property-based tests for theme toggle interaction
 * Feature: theme-switching, Property 5: Theme Toggle Interaction
 * 
 * Tests that for any theme option selection in the Theme_Toggle, the theme should 
 * immediately update and be visually indicated as active.
 * 
 * Validates: Requirements 2.3, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { ThemeProvider, type ThemeMode } from '@/contexts/theme-context'
import { ThemeToggle } from '@/components/shared/theme-toggle'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock matchMedia for system theme detection
const mockMatchMedia = vi.fn()

describe('Property 5: Theme Toggle Interaction', () => {
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
    
    // Default matchMedia implementation (dark system theme)
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

  it('Property 5.1: Theme toggle immediately updates theme for any option selection', async () => {
    const user = userEvent.setup()
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('light', 'dark', 'system'),
        fc.constantFrom('light', 'dark', 'system'),
        async (initialTheme: ThemeMode, targetTheme: ThemeMode) => {
          // Mock localStorage to return initial theme
          mockLocalStorage.getItem.mockReturnValue(initialTheme)
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={initialTheme}>
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Find the target theme button by exact text match to avoid ambiguity
            const themeLabels = {
              'light': 'Light',
              'dark': 'Dark', 
              'system': 'System'
            }
            
            const targetButton = screen.getByRole('radio', { 
              name: (name: string, element: Element): boolean => {
                // Get the button text content and check if it contains the exact theme label
                const buttonText = element?.textContent || ''
                return (buttonText.includes(themeLabels[targetTheme as keyof typeof themeLabels]) &&
                       // Ensure we're getting the right button by checking the title attribute
                       (element?.getAttribute('title')?.toLowerCase().includes(targetTheme === 'system' ? 'operating system' : targetTheme) || false)) || false
              }
            })
            expect(targetButton).toBeInTheDocument()

            // Click the target theme button
            await act(async () => {
              await user.click(targetButton)
            })

            // Verify the button is now marked as checked (active)
            expect(targetButton).toHaveAttribute('aria-checked', 'true')
            
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

  it('Property 5.2: Theme toggle visually indicates active theme for any theme mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (activeTheme: ThemeMode) => {
          // Mock localStorage to return the active theme
          mockLocalStorage.getItem.mockReturnValue(activeTheme)
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={activeTheme}>
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Get all theme option buttons by their exact labels
            const lightButton = screen.getByRole('radio', { 
              name: (name: string, element: Element): boolean => (element?.textContent?.includes('Light') && element?.getAttribute('title')?.includes('light')) || false
            })
            const darkButton = screen.getByRole('radio', { 
              name: (name: string, element: Element): boolean => (element?.textContent?.includes('Dark') && element?.getAttribute('title')?.includes('dark')) || false
            })
            const systemButton = screen.getByRole('radio', { 
              name: (name: string, element: Element): boolean => (element?.textContent?.includes('System') && element?.getAttribute('title')?.includes('operating system')) || false
            })

            // Verify only the active theme button is checked
            if (activeTheme === 'light') {
              expect(lightButton).toHaveAttribute('aria-checked', 'true')
              expect(darkButton).toHaveAttribute('aria-checked', 'false')
              expect(systemButton).toHaveAttribute('aria-checked', 'false')
            } else if (activeTheme === 'dark') {
              expect(lightButton).toHaveAttribute('aria-checked', 'false')
              expect(darkButton).toHaveAttribute('aria-checked', 'true')
              expect(systemButton).toHaveAttribute('aria-checked', 'false')
            } else if (activeTheme === 'system') {
              expect(lightButton).toHaveAttribute('aria-checked', 'false')
              expect(darkButton).toHaveAttribute('aria-checked', 'false')
              expect(systemButton).toHaveAttribute('aria-checked', 'true')
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 5.3: Theme toggle is keyboard accessible for any theme option', async () => {
    const user = userEvent.setup()
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('light', 'dark', 'system'),
        async (targetTheme: ThemeMode) => {
          const { unmount } = render(
            <ThemeProvider defaultTheme="dark">
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Find the target theme button by exact text and title match
            const themeLabels = {
              'light': 'Light',
              'dark': 'Dark', 
              'system': 'System'
            }
            
            const targetButton = screen.getByRole('radio', { 
              name: (name, element) => {
                const buttonText = element?.textContent || ''
                const title = element?.getAttribute('title') || ''
                return buttonText.includes(themeLabels[targetTheme as keyof typeof themeLabels]) &&
                       (targetTheme === 'system' ? title.includes('operating system') : title.toLowerCase().includes(targetTheme))
              }
            })

            // Focus the button using keyboard navigation
            await act(async () => {
              targetButton.focus()
            })

            // Verify button can receive focus
            expect(targetButton).toHaveFocus()

            // Activate using keyboard (Enter or Space)
            await act(async () => {
              await user.keyboard('{Enter}')
            })

            // Verify the button is now active
            expect(targetButton).toHaveAttribute('aria-checked', 'true')
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 5.4: Theme toggle provides screen reader compatibility for any theme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        (activeTheme: ThemeMode) => {
          const { unmount } = render(
            <ThemeProvider defaultTheme={activeTheme}>
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Verify radiogroup role for screen readers
            const radioGroup = screen.getByRole('radiogroup', { name: /theme selection/i })
            expect(radioGroup).toBeInTheDocument()

            // Verify all theme options have proper radio roles and descriptions
            const themeOptions = ['light', 'dark', 'system']
            const themeLabels = {
              'light': 'Light',
              'dark': 'Dark', 
              'system': 'System'
            }
            
            themeOptions.forEach(theme => {
              const button = screen.getByRole('radio', { 
                name: (name, element) => {
                  const buttonText = element?.textContent || ''
                  const title = element?.getAttribute('title') || ''
                  return buttonText.includes(themeLabels[theme as keyof typeof themeLabels]) &&
                         (theme === 'system' ? title.includes('operating system') : title.toLowerCase().includes(theme))
                }
              })
              expect(button).toBeInTheDocument()
              
              // Verify aria-describedby for additional context
              const describedBy = button.getAttribute('aria-describedby')
              expect(describedBy).toBeTruthy()
              
              // Verify the description element exists
              if (describedBy) {
                const description = document.getElementById(describedBy)
                expect(description).toBeInTheDocument()
                expect(description).toHaveClass('sr-only')
              }
            })

            // Verify active theme has proper aria-checked
            const activeButton = screen.getByRole('radio', { 
              name: (name, element) => {
                const buttonText = element?.textContent || ''
                const title = element?.getAttribute('title') || ''
                return buttonText.includes(themeLabels[activeTheme as keyof typeof themeLabels]) &&
                       (activeTheme === 'system' ? title.includes('operating system') : title.toLowerCase().includes(activeTheme))
              }
            })
            expect(activeButton).toHaveAttribute('aria-checked', 'true')
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 5.5: Theme toggle shows system theme context when system is selected', () => {
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
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Verify system theme context is shown
            const systemContext = screen.getByText(/following system preference/i)
            expect(systemContext).toBeInTheDocument()
            
            // Verify it shows the correct resolved theme in the context area
            const expectedTheme = isDarkSystem ? 'Dark' : 'Light'
            const contextArea = screen.getByText(/following system preference/i).parentElement
            expect(contextArea).toBeInTheDocument()
            
            // Look for the theme text within the context area specifically
            const themeSpan = contextArea?.querySelector('span.text-\\[var\\(--accent-primary\\)\\]')
            expect(themeSpan).toHaveTextContent(expectedTheme)
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 5.6: Theme toggle handles click events correctly for any theme option', async () => {
    const user = userEvent.setup()
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('light', 'dark', 'system'),
        fc.constantFrom('light', 'dark', 'system'),
        async (initialTheme: ThemeMode, targetTheme: ThemeMode) => {
          // Mock localStorage to return initial theme
          mockLocalStorage.getItem.mockReturnValue(initialTheme)
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={initialTheme}>
              <ThemeToggle />
            </ThemeProvider>
          )

          try {
            // Find the target theme button by exact text and title match
            const themeLabels = {
              'light': 'Light',
              'dark': 'Dark', 
              'system': 'System'
            }
            
            const targetButton = screen.getByRole('radio', { 
              name: (name, element) => {
                const buttonText = element?.textContent || ''
                const title = element?.getAttribute('title') || ''
                return buttonText.includes(themeLabels[targetTheme as keyof typeof themeLabels]) &&
                       (targetTheme === 'system' ? title.includes('operating system') : title.toLowerCase().includes(targetTheme))
              }
            })

            // Verify initial state
            const initiallyActive = targetTheme === initialTheme
            expect(targetButton).toHaveAttribute('aria-checked', initiallyActive.toString())

            // Click the button
            await act(async () => {
              await user.click(targetButton)
            })

            // Verify the button is now active regardless of initial state
            expect(targetButton).toHaveAttribute('aria-checked', 'true')
            
            // Verify other buttons are not active
            const allButtons = screen.getAllByRole('radio')
            const otherButtons = allButtons.filter(button => button !== targetButton)
            
            otherButtons.forEach(button => {
              expect(button).toHaveAttribute('aria-checked', 'false')
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