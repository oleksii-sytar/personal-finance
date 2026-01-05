/**
 * Property-based tests for authentication component route isolation
 * Feature: auth-page-refresh-fix, Property 2: Component Route Isolation
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import fc from 'fast-check'
import { AuthPageGuard } from '@/components/shared/auth-page-guard'
import { AuthComponentErrorBoundary } from '@/components/shared/auth-component-error-boundary'
import { 
  renderWithPathname, 
  AUTH_ROUTES, 
  NON_AUTH_ROUTES,
  generateRouteIsolationTestCases,
  ThrowError,
  resetAllMocks
} from '../fixtures/auth-isolation'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

// Test component that should only render on specific routes
function TestAuthComponent({ testId = 'test-auth-component' }: { testId?: string }) {
  return <div data-testid={testId}>Auth Component Content</div>
}

// Generate route test data
const allRoutes = Object.values({ ...AUTH_ROUTES, ...NON_AUTH_ROUTES })
const authRoutes = Object.values(AUTH_ROUTES)
const nonAuthRoutes = Object.values(NON_AUTH_ROUTES)

describe('Component Route Isolation Property Tests', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 2.1: AuthPageGuard only renders children on designated routes
   * For any authentication component and any route, the component should only render 
   * when the current route matches its designated route
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   */
  it('Property 2.1: AuthPageGuard enforces route-specific rendering', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...allRoutes),
        (requiredPath: string, currentPath: string) => {
          const shouldRender = currentPath === requiredPath
          
          // Render component with AuthPageGuard
          renderWithPathname(
            <AuthPageGuard requiredPath={requiredPath}>
              <TestAuthComponent />
            </AuthPageGuard>,
            currentPath
          )
          
          // Verify component renders only on correct route
          const component = screen.queryByTestId('test-auth-component')
          
          if (shouldRender) {
            expect(component).toBeInTheDocument()
          } else {
            expect(component).not.toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.2: AuthPageGuard prevents global instantiation
   * For any authentication component, it should never be instantiated on non-auth routes
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('Property 2.2: AuthPageGuard prevents global instantiation on non-auth routes', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...nonAuthRoutes),
        (requiredAuthPath: string, nonAuthPath: string) => {
          // Render auth component on non-auth route
          renderWithPathname(
            <AuthPageGuard requiredPath={requiredAuthPath}>
              <TestAuthComponent />
            </AuthPageGuard>,
            nonAuthPath
          )
          
          // Component should never render on non-auth routes
          const component = screen.queryByTestId('test-auth-component')
          expect(component).not.toBeInTheDocument()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.3: AuthPageGuard supports custom fallback components
   * For any route mismatch, AuthPageGuard should render the fallback component if provided
   * **Validates: Requirements 2.4, 2.5**
   */
  it('Property 2.3: AuthPageGuard renders fallback on route mismatch', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...allRoutes),
        fc.string({ minLength: 1, maxLength: 20 }),
        (requiredPath: string, currentPath: string, fallbackText: string) => {
          const shouldRenderFallback = currentPath !== requiredPath
          
          // Render with custom fallback
          renderWithPathname(
            <AuthPageGuard 
              requiredPath={requiredPath}
              fallback={<div data-testid="fallback">{fallbackText}</div>}
            >
              <TestAuthComponent />
            </AuthPageGuard>,
            currentPath
          )
          
          if (shouldRenderFallback) {
            // Should render fallback, not main component
            expect(screen.queryByTestId('test-auth-component')).not.toBeInTheDocument()
            expect(screen.getByTestId('fallback')).toBeInTheDocument()
            expect(screen.getByText(fallbackText)).toBeInTheDocument()
          } else {
            // Should render main component, not fallback
            expect(screen.getByTestId('test-auth-component')).toBeInTheDocument()
            expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.4: Multiple AuthPageGuards work independently
   * For any set of authentication components with different required paths,
   * each should only render on its designated route
   * **Validates: Requirements 2.1, 2.2, 2.4**
   */
  it('Property 2.4: Multiple AuthPageGuards maintain independent isolation', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...allRoutes),
        (requiredPath1: string, requiredPath2: string, currentPath: string) => {
          // Skip if both components have same required path (would both render)
          if (requiredPath1 === requiredPath2) return
          
          const shouldRender1 = currentPath === requiredPath1
          const shouldRender2 = currentPath === requiredPath2
          
          // Render multiple guarded components
          renderWithPathname(
            <div>
              <AuthPageGuard requiredPath={requiredPath1}>
                <TestAuthComponent testId="component-1" />
              </AuthPageGuard>
              <AuthPageGuard requiredPath={requiredPath2}>
                <TestAuthComponent testId="component-2" />
              </AuthPageGuard>
            </div>,
            currentPath
          )
          
          // Verify each component renders independently
          const component1 = screen.queryByTestId('component-1')
          const component2 = screen.queryByTestId('component-2')
          
          if (shouldRender1) {
            expect(component1).toBeInTheDocument()
          } else {
            expect(component1).not.toBeInTheDocument()
          }
          
          if (shouldRender2) {
            expect(component2).toBeInTheDocument()
          } else {
            expect(component2).not.toBeInTheDocument()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.5: AuthComponentErrorBoundary isolates authentication errors
   * For any error thrown by authentication components, the error should be contained
   * and not affect other parts of the application
   * **Validates: Requirements 10.1, 10.2, 10.3**
   */
  it('Property 2.5: AuthComponentErrorBoundary contains authentication errors', async () => {
    await fc.assert(
      fc.property(
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (shouldThrow: boolean, errorMessage: string) => {
          // Suppress console.error for this test
          const originalError = console.error
          console.error = vi.fn()
          
          try {
            // Render component that may throw error
            render(
              <div>
                <AuthComponentErrorBoundary>
                  <ThrowError shouldThrow={shouldThrow} />
                </AuthComponentErrorBoundary>
                <div data-testid="outside-boundary">Outside content</div>
              </div>
            )
            
            if (shouldThrow) {
              // Error should be caught and fallback rendered
              expect(screen.queryByTestId('no-error')).not.toBeInTheDocument()
              expect(screen.getByText(/Authentication component error/)).toBeInTheDocument()
              expect(screen.getByText('Retry')).toBeInTheDocument()
            } else {
              // No error, component should render normally
              expect(screen.getByTestId('no-error')).toBeInTheDocument()
              expect(screen.queryByText(/Authentication component error/)).not.toBeInTheDocument()
            }
            
            // Content outside boundary should always be present
            expect(screen.getByTestId('outside-boundary')).toBeInTheDocument()
          } finally {
            // Restore console.error
            console.error = originalError
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.6: Route isolation works with nested components
   * For any authentication component tree, route isolation should work at any nesting level
   * **Validates: Requirements 2.1, 2.4, 2.5**
   */
  it('Property 2.6: Route isolation works with component nesting', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...allRoutes),
        fc.integer({ min: 1, max: 5 }),
        (requiredPath: string, currentPath: string, nestingLevel: number) => {
          const shouldRender = currentPath === requiredPath
          
          // Create nested structure
          let nestedComponent = <TestAuthComponent testId="nested-auth" />
          
          for (let i = 0; i < nestingLevel; i++) {
            nestedComponent = (
              <div data-testid={`wrapper-${i}`}>
                {nestedComponent}
              </div>
            )
          }
          
          // Wrap in AuthPageGuard
          renderWithPathname(
            <AuthPageGuard requiredPath={requiredPath}>
              {nestedComponent}
            </AuthPageGuard>,
            currentPath
          )
          
          // Verify isolation works regardless of nesting
          const authComponent = screen.queryByTestId('nested-auth')
          
          if (shouldRender) {
            expect(authComponent).toBeInTheDocument()
            // All wrapper levels should be present
            for (let i = 0; i < nestingLevel; i++) {
              expect(screen.getByTestId(`wrapper-${i}`)).toBeInTheDocument()
            }
          } else {
            expect(authComponent).not.toBeInTheDocument()
            // No wrapper levels should be present
            for (let i = 0; i < nestingLevel; i++) {
              expect(screen.queryByTestId(`wrapper-${i}`)).not.toBeInTheDocument()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.7: Route isolation is consistent across page refreshes
   * For any route and authentication component, isolation behavior should be 
   * consistent regardless of how the page was loaded
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('Property 2.7: Route isolation consistency across different load scenarios', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom(...authRoutes),
        fc.constantFrom(...allRoutes),
        (requiredPath: string, currentPath: string) => {
          const shouldRender = currentPath === requiredPath
          
          // Test multiple render scenarios (simulating different load conditions)
          const scenarios = [
            'initial-load',
            'navigation',
            'refresh'
          ]
          
          scenarios.forEach(scenario => {
            // Clean up previous render
            const { unmount } = renderWithPathname(
              <AuthPageGuard requiredPath={requiredPath}>
                <TestAuthComponent testId={`component-${scenario}`} />
              </AuthPageGuard>,
              currentPath
            )
            
            // Verify consistent behavior
            const component = screen.queryByTestId(`component-${scenario}`)
            
            if (shouldRender) {
              expect(component).toBeInTheDocument()
            } else {
              expect(component).not.toBeInTheDocument()
            }
            
            unmount()
          })
        }
      ),
      { numRuns: 50 }
    )
  })
})