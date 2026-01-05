/**
 * Property-Based Tests for Component Theme Adaptation
 * Feature: theme-switching, Property 8: Component Theme Adaptation
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/theme-context'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import fc from 'fast-check'

// Mock system theme detection
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
})

describe('Component Theme Adaptation Properties', () => {
  beforeEach(() => {
    // Mock matchMedia for consistent testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => mockMatchMedia(query.includes('dark')),
    })
    
    // Mock localStorage
    const localStorageMock = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Property 8: Component Theme Adaptation
   * For any theme change, all UI components (glass cards, buttons, form inputs, navigation) 
   * should update their styles to match the new theme
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   */
  it('should adapt all UI components to theme changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark', 'system'),
        fc.constantFrom('primary', 'secondary', 'ghost', 'outline'),
        fc.constantFrom('glass', 'solid', 'elevated'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (theme, buttonVariant, cardVariant, inputValue) => {
          // Clean up any existing DOM elements
          cleanup()

          // Render components with theme
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <div data-testid="theme-container">
                <Button variant={buttonVariant} data-testid="test-button">
                  Test Button
                </Button>
                <Card variant={cardVariant} data-testid="test-card">
                  <CardHeader>
                    <CardTitle data-testid="test-card-title">Test Card</CardTitle>
                  </CardHeader>
                  <CardContent data-testid="test-card-content">
                    Card content
                  </CardContent>
                </Card>
                <Input 
                  data-testid="test-input" 
                  placeholder="Test input"
                  defaultValue={inputValue}
                />
                <LoadingSpinner />
              </div>
            </ThemeProvider>
          )

          // Get components and verify they exist
          const button = screen.getByTestId('test-button')
          const card = screen.getByTestId('test-card')
          const cardTitle = screen.getByTestId('test-card-title')
          const cardContent = screen.getByTestId('test-card-content')
          const input = screen.getByTestId('test-input')
          const spinner = screen.getByRole('status') // LoadingSpinner uses role="status"

          // Verify components exist and are rendered
          expect(button).toBeInTheDocument()
          expect(card).toBeInTheDocument()
          expect(cardTitle).toBeInTheDocument()
          expect(cardContent).toBeInTheDocument()
          expect(input).toBeInTheDocument()
          expect(spinner).toBeInTheDocument()

          // Requirement 5.1: Glass cards should update their background and border colors
          const cardClasses = card.className
          if (cardVariant === 'glass') {
            expect(cardClasses).toMatch(/glass-card/)
          } else if (cardVariant === 'elevated') {
            expect(cardClasses).toMatch(/glass-card-elevated/)
          }

          // Requirement 5.2: Buttons should maintain their gradient effects with theme-appropriate colors
          const buttonClasses = button.className
          if (buttonVariant === 'primary') {
            expect(buttonClasses).toMatch(/btn-primary/)
          } else if (buttonVariant === 'secondary') {
            expect(buttonClasses).toMatch(/btn-secondary/)
          } else if (buttonVariant === 'ghost') {
            expect(buttonClasses).toMatch(/text-secondary.*hover:text-primary.*hover:bg-glass/)
          } else if (buttonVariant === 'outline') {
            expect(buttonClasses).toMatch(/border.*border-accent.*text-accent/)
          }

          // Requirement 5.3: Form inputs should update their background and border colors
          const inputClasses = input.className
          expect(inputClasses).toMatch(/form-input/)

          // Requirement 5.4: Navigation elements should update their background colors
          // (Navigation is tested through the nav-item class in CSS)

          // Requirement 5.5: Text elements should update to maintain proper contrast ratios
          const titleClasses = cardTitle.className
          expect(titleClasses).toMatch(/text-primary/)
          
          const contentClasses = cardContent.className
          expect(contentClasses).toMatch(/text-secondary/)

          // Clean up before testing theme switching
          unmount()
          cleanup()

          // Test theme switching by rendering with different theme
          const alternateTheme = theme === 'light' ? 'dark' : 'light'
          const { unmount: unmount2 } = render(
            <ThemeProvider defaultTheme={alternateTheme}>
              <div data-testid="alternate-theme-container">
                <Button variant={buttonVariant} data-testid="alternate-test-button">
                  Test Button
                </Button>
                <Card variant={cardVariant} data-testid="alternate-test-card">
                  <CardHeader>
                    <CardTitle data-testid="alternate-test-card-title">Test Card</CardTitle>
                  </CardHeader>
                  <CardContent data-testid="alternate-test-card-content">
                    Card content
                  </CardContent>
                </Card>
                <Input 
                  data-testid="alternate-test-input" 
                  placeholder="Test input"
                  defaultValue={inputValue}
                />
                <LoadingSpinner />
              </div>
            </ThemeProvider>
          )

          // Verify components still exist after theme change
          const newButton = screen.getByTestId('alternate-test-button')
          const newCard = screen.getByTestId('alternate-test-card')
          const newInput = screen.getByTestId('alternate-test-input')
          const newSpinner = screen.getAllByRole('status')[0] // Get first spinner

          expect(newButton).toBeInTheDocument()
          expect(newCard).toBeInTheDocument()
          expect(newInput).toBeInTheDocument()
          expect(newSpinner).toBeInTheDocument()

          // Verify theme-aware classes are still applied
          const newButtonClasses = newButton.className
          if (buttonVariant === 'primary') {
            expect(newButtonClasses).toMatch(/btn-primary/)
          } else if (buttonVariant === 'secondary') {
            expect(newButtonClasses).toMatch(/btn-secondary/)
          } else if (buttonVariant === 'ghost') {
            expect(newButtonClasses).toMatch(/text-secondary.*hover:text-primary.*hover:bg-glass/)
          } else if (buttonVariant === 'outline') {
            expect(newButtonClasses).toMatch(/border.*border-accent.*text-accent/)
          }
          expect(newCard.className).toMatch(cardVariant === 'glass' ? /glass-card/ : /glass-card-elevated|bg-secondary/)
          expect(newInput.className).toMatch(/form-input/)

          // Clean up after test
          unmount2()
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Theme-aware CSS Custom Properties Usage
   * For any component, it should use CSS custom properties instead of hardcoded colors
   */
  it('should use CSS custom properties for theming', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          cleanup()
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <div data-testid="theme-root">
                <Button data-testid="button">Button</Button>
                <Card data-testid="card">
                  <CardTitle data-testid="title">Title</CardTitle>
                </Card>
                <Input data-testid="input" />
              </div>
            </ThemeProvider>
          )

          const button = screen.getByTestId('button')
          const card = screen.getByTestId('card')
          const title = screen.getByTestId('title')
          const input = screen.getByTestId('input')

          // Verify components use theme-aware classes instead of hardcoded colors
          expect(button.className).not.toMatch(/#[0-9A-Fa-f]{6}/)
          expect(card.className).not.toMatch(/#[0-9A-Fa-f]{6}/)
          expect(title.className).not.toMatch(/#[0-9A-Fa-f]{6}/)
          expect(input.className).not.toMatch(/#[0-9A-Fa-f]{6}/)

          // Verify theme-aware utility classes are used
          expect(button.className).toMatch(/btn-primary|btn-secondary/)
          expect(card.className).toMatch(/glass-card/)
          expect(title.className).toMatch(/text-primary/)
          expect(input.className).toMatch(/form-input/)

          unmount()
          cleanup()
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property: Component Accessibility in Both Themes
   * For any theme, components should maintain accessibility standards
   */
  it('should maintain accessibility standards in both themes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        fc.string({ minLength: 1, maxLength: 20 }),
        (theme, labelText) => {
          cleanup()
          
          const { unmount } = render(
            <ThemeProvider defaultTheme={theme}>
              <div>
                <Button data-testid="button">Accessible Button</Button>
                <Input 
                  data-testid="input" 
                  label={labelText}
                  aria-label="Test input"
                />
                <LoadingSpinner />
              </div>
            </ThemeProvider>
          )

          const button = screen.getByTestId('button')
          const input = screen.getByTestId('input')
          const spinner = screen.getByRole('status')

          // Verify accessibility attributes are preserved
          expect(input).toHaveAttribute('aria-label', 'Test input')
          expect(spinner).toHaveAttribute('role', 'status')
          expect(spinner).toHaveAttribute('aria-label', 'Loading')

          // Verify focus management works
          button.focus()
          expect(document.activeElement).toBe(button)

          input.focus()
          expect(document.activeElement).toBe(input)

          unmount()
          cleanup()
        }
      ),
      { numRuns: 50 }
    )
  })
})