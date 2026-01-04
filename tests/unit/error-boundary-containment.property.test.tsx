/**
 * Property-based tests for error boundary containment
 * Feature: auth-page-refresh-fix, Property 10: Error Boundary Containment
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import fc from 'fast-check'
import { AuthComponentErrorBoundary } from '@/components/shared/auth-component-error-boundary'
import { 
  ThrowError,
  MockAuthError
} from '../fixtures/auth-isolation'

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error

describe('Error Boundary Containment Property Tests', () => {
  beforeEach(() => {
    // Mock console.error to avoid test noise
    console.error = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    console.error = originalConsoleError
  })

  /**
   * Property 10.1: Authentication errors are contained within error boundaries
   * For any authentication error, it should be caught by AuthComponentErrorBoundary
   * and not propagate to parent components or affect other parts of the application
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('Property 10.1: Authentication errors are contained and isolated', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (shouldThrow: boolean, errorMessage: string) => {
          let parentErrorCaught = false
          
          // Parent error boundary to catch any errors that escape
          class ParentErrorBoundary extends React.Component<
            { children: React.ReactNode },
            { hasError: boolean }
          > {
            constructor(props: any) {
              super(props)
              this.state = { hasError: false }
            }
            
            static getDerivedStateFromError() {
              return { hasError: true }
            }
            
            componentDidCatch() {
              parentErrorCaught = true
            }
            
            render() {
              if (this.state.hasError) {
                return <div data-testid="parent-error">Parent caught error</div>
              }
              return this.props.children
            }
          }
          
          render(
            <ParentErrorBoundary>
              <div data-testid="sibling-before">Sibling Before</div>
              <AuthComponentErrorBoundary>
                <ThrowError shouldThrow={shouldThrow} errorMessage={errorMessage} />
              </AuthComponentErrorBoundary>
              <div data-testid="sibling-after">Sibling After</div>
            </ParentErrorBoundary>
          )
          
          if (shouldThrow) {
            // Error should be contained in AuthComponentErrorBoundary
            expect(screen.queryByTestId('no-error')).not.toBeInTheDocument()
            expect(screen.getByText(/Authentication Error/)).toBeInTheDocument()
            expect(parentErrorCaught).toBe(false)
            
            // Sibling components should not be affected
            expect(screen.getByTestId('sibling-before')).toBeInTheDocument()
            expect(screen.getByTestId('sibling-after')).toBeInTheDocument()
            expect(screen.queryByTestId('parent-error')).not.toBeInTheDocument()
          } else {
            // No error, everything should render normally
            expect(screen.getByTestId('no-error')).toBeInTheDocument()
            expect(screen.queryByText(/Authentication Error/)).not.toBeInTheDocument()
            expect(parentErrorCaught).toBe(false)
            expect(screen.getByTestId('sibling-before')).toBeInTheDocument()
            expect(screen.getByTestId('sibling-after')).toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  /**
   * Property 10.2: Error boundary provides appropriate fallbacks
   * For any authentication error, the error boundary should provide a user-friendly
   * fallback UI with recovery mechanisms
   * **Validates: Requirements 10.4, 10.5**
   */
  it('Property 10.2: Error boundary provides appropriate fallbacks and recovery', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (shouldThrow: boolean, customFallbackText: string) => {
          const customFallback = (
            <div data-testid="custom-fallback">{customFallbackText}</div>
          )
          
          render(
            <AuthComponentErrorBoundary fallback={customFallback}>
              <ThrowError shouldThrow={shouldThrow} />
            </AuthComponentErrorBoundary>
          )
          
          if (shouldThrow) {
            // Should render custom fallback
            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
            expect(screen.getByText(customFallbackText)).toBeInTheDocument()
            expect(screen.queryByTestId('no-error')).not.toBeInTheDocument()
          } else {
            // Should render normal component
            expect(screen.getByTestId('no-error')).toBeInTheDocument()
            expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.3: Error boundary recovery mechanisms work correctly
   * For any authentication error, the retry functionality should allow recovery
   * **Validates: Requirements 10.4, 10.5**
   */
  it('Property 10.3: Error boundary retry mechanism enables recovery', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (errorMessage: string) => {
          // Component that can be toggled between error and success states
          let shouldThrow = true
          
          function ToggleableErrorComponent(): React.ReactElement {
            if (shouldThrow) {
              throw new MockAuthError(errorMessage)
            }
            return <div data-testid="recovered">Component recovered</div>
          }
          
          render(
            <AuthComponentErrorBoundary>
              <ToggleableErrorComponent />
            </AuthComponentErrorBoundary>
          )
          
          // Initially should show error
          expect(screen.getByText(/Authentication Error/)).toBeInTheDocument()
          expect(screen.getByText('Try Again')).toBeInTheDocument()
          expect(screen.queryByTestId('recovered')).not.toBeInTheDocument()
          
          // Simulate fixing the error condition
          shouldThrow = false
          
          // Click retry button
          fireEvent.click(screen.getByText('Try Again'))
          
          // Should recover and show normal component
          expect(screen.getByTestId('recovered')).toBeInTheDocument()
          expect(screen.queryByText(/Authentication Error/)).not.toBeInTheDocument()
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Property 10.4: Multiple error boundaries work independently
   * For any set of authentication components with their own error boundaries,
   * errors in one should not affect others
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('Property 10.4: Multiple error boundaries maintain independent isolation', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (shouldThrow1: boolean, shouldThrow2: boolean, error1: string, error2: string) => {
          render(
            <div>
              <AuthComponentErrorBoundary>
                <div data-testid="boundary-1-container">
                  <ThrowError shouldThrow={shouldThrow1} errorMessage={error1} />
                </div>
              </AuthComponentErrorBoundary>
              
              <AuthComponentErrorBoundary>
                <div data-testid="boundary-2-container">
                  <ThrowError shouldThrow={shouldThrow2} errorMessage={error2} />
                </div>
              </AuthComponentErrorBoundary>
              
              <div data-testid="outside-boundaries">Independent content</div>
            </div>
          )
          
          // Check first boundary
          if (shouldThrow1) {
            expect(screen.queryByTestId('boundary-1-container')).not.toBeInTheDocument()
          } else {
            expect(screen.getByTestId('boundary-1-container')).toBeInTheDocument()
          }
          
          // Check second boundary
          if (shouldThrow2) {
            expect(screen.queryByTestId('boundary-2-container')).not.toBeInTheDocument()
          } else {
            expect(screen.getByTestId('boundary-2-container')).toBeInTheDocument()
          }
          
          // Content outside boundaries should always be present
          expect(screen.getByTestId('outside-boundaries')).toBeInTheDocument()
          
          // Count error messages (should match number of throwing components)
          const errorMessages = screen.queryAllByText(/Authentication Error/)
          const expectedErrors = (shouldThrow1 ? 1 : 0) + (shouldThrow2 ? 1 : 0)
          expect(errorMessages).toHaveLength(expectedErrors)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10.5: Error boundaries handle different error types appropriately
   * For any type of error (auth-specific or general), the boundary should handle it
   * appropriately and provide consistent fallback behavior
   * **Validates: Requirements 10.1, 10.3, 10.4**
   */
  it('Property 10.5: Error boundaries handle various error types consistently', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('auth', 'network', 'validation', 'generic'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (errorType: string, errorMessage: string) => {
          function TypedErrorComponent(): React.ReactElement {
            switch (errorType) {
              case 'auth':
                throw new MockAuthError(`Auth error: ${errorMessage}`)
              case 'network':
                throw new Error(`Network error: ${errorMessage}`)
              case 'validation':
                throw new Error(`Validation error: ${errorMessage}`)
              default:
                throw new Error(`Generic error: ${errorMessage}`)
            }
          }
          
          render(
            <div>
              <AuthComponentErrorBoundary>
                <TypedErrorComponent />
              </AuthComponentErrorBoundary>
              <div data-testid="unaffected-content">This should always be visible</div>
            </div>
          )
          
          // All error types should be caught and show fallback
          expect(screen.getByText(/Authentication Error/)).toBeInTheDocument()
          expect(screen.getByText('Try Again')).toBeInTheDocument()
          expect(screen.getByText('Refresh Page')).toBeInTheDocument()
          expect(screen.getByText('Go to Login')).toBeInTheDocument()
          
          // Content outside boundary should not be affected
          expect(screen.getByTestId('unaffected-content')).toBeInTheDocument()
        }
      ),
      { numRuns: 100 }
    )
  })
})