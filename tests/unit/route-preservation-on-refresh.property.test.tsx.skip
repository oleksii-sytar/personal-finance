/**
 * Property-Based Test: Route Preservation on Refresh
 * 
 * **Property 1: Route Preservation on Refresh**
 * *For any* protected route and authenticated user state, page refresh should preserve the current route
 * **Validates: Requirements 1.1, 1.5**
 * 
 * **Feature: auth-page-refresh-fix, Task 13.2: Route Preservation Property Test**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { HistoryProvider } from '@/components/shared/history-provider'
import { BookmarkHandler } from '@/components/shared/bookmark-handler'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
import { sessionManager } from '@/lib/session/session-manager'
import fc from 'fast-check'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock session manager
vi.mock('@/lib/session/session-manager', () => ({
  sessionManager: {
    validateSession: vi.fn(),
    getState: vi.fn(),
    clearSession: vi.fn(),
  },
}))

// Mock post-login check hook
vi.mock('@/hooks/use-post-login-check', () => ({
  usePostLoginCheck: vi.fn(() => ({
    hasPendingInvitations: false,
    pendingInvitations: [],
    isLoading: false,
    error: null,
    checkComplete: true,
  })),
}))

// Route and user state generators for property testing
const protectedRouteArb = fc.constantFrom(
  '/dashboard',
  '/transactions',
  '/settings',
  '/reports',
  '/categories',
  '/onboarding/workspace'
)

const authenticatedUserStateArb = fc.record({
  isAuthenticated: fc.constant(true),
  isEmailVerified: fc.boolean(),
  hasWorkspace: fc.boolean(),
  userId: fc.uuid(),
  email: fc.emailAddress(),
})

const refreshScenarioArb = fc.record({
  route: protectedRouteArb,
  userState: authenticatedUserStateArb,
  hasReferrer: fc.boolean(),
  hasHistoryState: fc.boolean(),
  hasReturnUrl: fc.boolean(),
})

describe('Property Test: Route Preservation on Refresh', () => {
  const mockPush = vi.fn()
  const mockReplace = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup router mock
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any)

    // Setup search params mock
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => key === 'returnUrl' ? null : null),
      toString: vi.fn(() => ''),
    } as any)

    // Setup session manager mock
    vi.mocked(sessionManager.validateSession).mockResolvedValue(true)
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: null,
      session: null,
      lastValidated: new Date(),
      isValid: false,
    })
    vi.mocked(sessionManager.clearSession).mockResolvedValue(undefined)

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        state: null,
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with providers
  const createTestWrapper = (scenario: any) => {
    // Mock pathname based on scenario
    vi.mocked(usePathname).mockReturnValue(scenario.route)

    // Setup authenticated user mock
    const mockUser = scenario.userState.isAuthenticated ? {
      id: scenario.userState.userId,
      email: scenario.userState.email,
      email_confirmed_at: scenario.userState.isEmailVerified ? new Date().toISOString() : null,
    } : null

    const mockSupabase = {
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: mockUser ? {
              user: mockUser,
              access_token: 'mock-token',
              expires_at: Date.now() + 3600000,
            } : null
          },
          error: null
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: scenario.userState.hasWorkspace ? {
                id: 'test-workspace-id',
                name: 'Test Workspace',
                owner_id: scenario.userState.userId,
              } : null,
              error: null
            })),
          })),
        })),
      })),
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Mock referrer based on scenario (simulate page refresh)
    Object.defineProperty(document, 'referrer', {
      value: scenario.hasReferrer ? `${window.location.origin}/some-other-page` : '',
      writable: true,
    })

    // Mock history state if needed
    if (scenario.hasHistoryState) {
      Object.defineProperty(window, 'history', {
        value: {
          pushState: vi.fn(),
          replaceState: vi.fn(),
          back: vi.fn(),
          forward: vi.fn(),
          state: {
            returnUrl: scenario.hasReturnUrl ? '/previous-page' : null,
            preserveHistory: true,
            timestamp: Date.now(),
          },
        },
        writable: true,
      })
    }

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>
        <WorkspaceProvider>
          <HistoryProvider>
            <BookmarkHandler>
              {children}
            </BookmarkHandler>
          </HistoryProvider>
        </WorkspaceProvider>
      </AuthProvider>
    )
    
    TestWrapper.displayName = 'RoutePreservationTestWrapper'
    return TestWrapper
  }

  it('authenticated users should stay on their current route after page refresh', () => {
    fc.assert(
      fc.property(refreshScenarioArb, async (scenario) => {
        // Focus on authenticated users with verified email and workspace
        fc.pre(
          scenario.userState.isAuthenticated &&
          scenario.userState.isEmailVerified &&
          scenario.userState.hasWorkspace
        )

        const TestWrapper = createTestWrapper(scenario)

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true}>
              <div data-testid="route-content">
                Current Route: {scenario.route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Property: Authenticated users should see their intended route content
        await waitFor(() => {
          expect(screen.getByTestId('route-content')).toBeInTheDocument()
        }, { timeout: 2000 })

        expect(screen.getByText(`Current Route: ${scenario.route}`)).toBeInTheDocument()

        // Property: No unexpected redirects should occur for authenticated users
        expect(mockPush).not.toHaveBeenCalledWith('/auth/login')
        expect(mockReplace).not.toHaveBeenCalledWith('/auth/login')
        
        // Property: Should not redirect to dashboard from other routes
        if (scenario.route !== '/dashboard') {
          expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
          expect(mockReplace).not.toHaveBeenCalledWith('/dashboard')
        }
      }),
      { numRuns: 30 }
    )
  })

  it('page refresh should preserve route regardless of referrer state', () => {
    fc.assert(
      fc.property(refreshScenarioArb, async (scenario) => {
        // Test both with and without referrer (different refresh scenarios)
        fc.pre(
          scenario.userState.isAuthenticated &&
          scenario.userState.isEmailVerified &&
          scenario.userState.hasWorkspace
        )

        const TestWrapper = createTestWrapper(scenario)

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="preserved-route">
                Preserved: {scenario.route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Property: Route should be preserved regardless of referrer state
        await waitFor(() => {
          expect(screen.getByTestId('preserved-route')).toBeInTheDocument()
        }, { timeout: 2000 })

        // Property: Content should match the intended route
        expect(screen.getByText(`Preserved: ${scenario.route}`)).toBeInTheDocument()

        // Property: Referrer state should not affect route preservation
        const redirectCalls = mockPush.mock.calls.concat(mockReplace.mock.calls)
        const unexpectedRedirects = redirectCalls.filter(call => 
          call[0] !== scenario.route && 
          !call[0].includes(scenario.route)
        )
        
        expect(unexpectedRedirects.length).toBe(0)
      }),
      { numRuns: 30 }
    )
  })

  it('browser history state should be preserved during page refresh', () => {
    fc.assert(
      fc.property(refreshScenarioArb, async (scenario) => {
        // Focus on scenarios with history state
        fc.pre(
          scenario.userState.isAuthenticated &&
          scenario.userState.isEmailVerified &&
          scenario.userState.hasWorkspace &&
          scenario.hasHistoryState
        )

        const TestWrapper = createTestWrapper(scenario)

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="history-preserved">
                Route with history: {scenario.route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByTestId('history-preserved')).toBeInTheDocument()
        }, { timeout: 2000 })

        // Property: History state should be preserved
        if (scenario.hasHistoryState) {
          expect(window.history.state).toEqual(
            expect.objectContaining({
              preserveHistory: true,
            })
          )
          
          if (scenario.hasReturnUrl) {
            expect(window.history.state).toEqual(
              expect.objectContaining({
                returnUrl: '/previous-page',
              })
            )
          }
        }

        // Property: History preservation should not interfere with route display
        expect(screen.getByText(`Route with history: ${scenario.route}`)).toBeInTheDocument()
      }),
      { numRuns: 30 }
    )
  })

  it('route preservation should work for all protected routes', () => {
    fc.assert(
      fc.property(protectedRouteArb, authenticatedUserStateArb, async (route, userState) => {
        // Ensure user meets requirements for protected routes
        fc.pre(
          userState.isAuthenticated &&
          userState.isEmailVerified &&
          userState.hasWorkspace
        )

        const scenario = {
          route,
          userState,
          hasReferrer: false, // Simulate page refresh
          hasHistoryState: false,
          hasReturnUrl: false,
        }

        const TestWrapper = createTestWrapper(scenario)

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true}>
              <div data-testid="protected-route">
                Protected Route: {route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Property: All protected routes should be preserved on refresh
        await waitFor(() => {
          expect(screen.getByTestId('protected-route')).toBeInTheDocument()
        }, { timeout: 2000 })

        expect(screen.getByText(`Protected Route: ${route}`)).toBeInTheDocument()

        // Property: No route should redirect to login when user is authenticated
        expect(mockPush).not.toHaveBeenCalledWith('/auth/login')
        expect(mockReplace).not.toHaveBeenCalledWith('/auth/login')

        // Property: Routes should not auto-redirect to dashboard
        if (route !== '/dashboard') {
          expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
          expect(mockReplace).not.toHaveBeenCalledWith('/dashboard')
        }
      }),
      { numRuns: 50 }
    )
  })

  it('authentication component isolation should be maintained during refresh', () => {
    fc.assert(
      fc.property(refreshScenarioArb, async (scenario) => {
        // Focus on non-auth routes
        fc.pre(
          scenario.userState.isAuthenticated &&
          scenario.userState.isEmailVerified &&
          scenario.userState.hasWorkspace &&
          !scenario.route.includes('/auth/')
        )

        const TestWrapper = createTestWrapper(scenario)

        // Mock console to track component instantiation
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="non-auth-route">
                Non-auth route: {scenario.route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByTestId('non-auth-route')).toBeInTheDocument()
        }, { timeout: 2000 })

        // Property: Auth components should not be instantiated on non-auth routes
        const authComponentLogs = consoleSpy.mock.calls.filter(call =>
          call.some(arg => 
            typeof arg === 'string' && (
              arg.includes('LoginForm') ||
              arg.includes('RegisterForm') ||
              arg.includes('ResetPasswordForm') ||
              arg.includes('VerifyEmailForm')
            )
          )
        )

        expect(authComponentLogs.length).toBe(0)

        // Property: Non-auth routes should display their content
        expect(screen.getByText(`Non-auth route: ${scenario.route}`)).toBeInTheDocument()

        consoleSpy.mockRestore()
      }),
      { numRuns: 30 }
    )
  })
})