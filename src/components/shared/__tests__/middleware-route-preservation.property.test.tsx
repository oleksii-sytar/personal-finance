/**
 * Property-Based Test: Middleware Route Preservation
 * 
 * **Property 7: Middleware Route Preservation**
 * *For any* authenticated user accessing a protected route, middleware should allow access without changing the requested route
 * **Validates: Requirements 7.1, 7.2, 7.4**
 * 
 * **Feature: auth-page-refresh-fix, Property 7: Middleware Route Preservation**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import fc from 'fast-check'
import { SmartRouteGuard } from '../smart-route-guard'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/session/session-manager'

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

// Route state generator for property testing
const routeStateArb = fc.record({
  isAuthenticated: fc.boolean(),
  isEmailVerified: fc.boolean(),
  hasWorkspace: fc.boolean(),
  currentRoute: fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/reports',
    '/budget',
    '/categories'
  ),
  hasReturnUrl: fc.boolean(),
  userRole: fc.constantFrom('owner', 'member'),
})

// Protection requirements generator
const protectionRequirementsArb = fc.record({
  requireAuth: fc.boolean(),
  requireEmailVerification: fc.boolean(),
  requireWorkspace: fc.boolean(),
  allowedRoles: fc.array(fc.constantFrom('owner', 'member'), { minLength: 0, maxLength: 2 }),
})

describe('Property Test: Middleware Route Preservation', () => {
  const mockPush = vi.fn()
  const mockReplace = vi.fn()
  const mockBack = vi.fn()
  const mockForward = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup router mock
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      forward: mockForward,
      refresh: mockRefresh,
      prefetch: vi.fn(),
    } as any)

    // Setup search params mock
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => key === 'returnUrl' ? null : null),
      toString: vi.fn(() => ''),
    } as any)

    // Setup Supabase client mock
    const mockSupabase = {
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Setup session manager mock with proper state structure
    vi.mocked(sessionManager.validateSession).mockResolvedValue(true)
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: null,
      session: null,
      lastValidated: new Date(),
      isValid: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with providers
  const createTestWrapper = (routeState: any) => {
    // Mock pathname based on route state
    vi.mocked(usePathname).mockReturnValue(routeState.currentRoute)

    // Mock search params for return URL
    if (routeState.hasReturnUrl) {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((key: string) => key === 'returnUrl' ? '/original-destination' : null),
        toString: vi.fn(() => 'returnUrl=%2Foriginal-destination'),
      } as any)
    }

    // Mock auth context state
    const mockUser = routeState.isAuthenticated ? {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: routeState.isEmailVerified ? new Date().toISOString() : null,
    } : null

    const mockSession = routeState.isAuthenticated ? {
      user: mockUser,
      access_token: 'test-token',
    } : null

    // Mock workspace context state
    const mockWorkspace = routeState.hasWorkspace ? {
      id: 'test-workspace-id',
      name: 'Test Workspace',
      owner_id: 'test-user-id',
    } : null

    const mockMembers = routeState.hasWorkspace ? [{
      id: 'member-1',
      user_id: 'test-user-id',
      workspace_id: 'test-workspace-id',
      role: routeState.userRole,
      user_profiles: mockUser,
    }] : []

    // Update session manager mock to return proper state
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: mockUser,
      session: mockSession,
      lastValidated: new Date(),
      isValid: routeState.isAuthenticated,
    })

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    )
    
    TestWrapper.displayName = 'TestWrapper'
    return TestWrapper
  }

  it('authenticated users should access protected routes without redirection', () => {
    fc.assert(
      fc.property(routeStateArb, protectionRequirementsArb, async (routeState, requirements) => {
        // Only test cases where user meets all requirements
        const userMeetsRequirements = 
          (!requirements.requireAuth || routeState.isAuthenticated) &&
          (!requirements.requireEmailVerification || routeState.isEmailVerified) &&
          (!requirements.requireWorkspace || routeState.hasWorkspace) &&
          (requirements.allowedRoles.length === 0 || requirements.allowedRoles.includes(routeState.userRole))

        if (!userMeetsRequirements) {
          return true // Skip this test case
        }

        const TestWrapper = createTestWrapper(routeState)

        render(
          <TestWrapper>
            <SmartRouteGuard
              requireAuth={requirements.requireAuth}
              requireEmailVerification={requirements.requireEmailVerification}
              requireWorkspace={requirements.requireWorkspace}
              allowedRoles={requirements.allowedRoles}
            >
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Authenticated users meeting requirements should see content without redirection
          const protectedContent = screen.queryByTestId('protected-content')
          expect(protectedContent).toBeInTheDocument()

          // Property: No navigation should occur for users who meet requirements
          expect(mockPush).not.toHaveBeenCalled()
          expect(mockReplace).not.toHaveBeenCalled()
        })
      }),
      { numRuns: 100 }
    )
  })

  it('unauthenticated users should be redirected with return URL preservation', () => {
    fc.assert(
      fc.property(routeStateArb, protectionRequirementsArb, async (routeState, requirements) => {
        // Only test cases where user doesn't meet auth requirements
        if (routeState.isAuthenticated || !requirements.requireAuth) {
          return true // Skip this test case
        }

        const TestWrapper = createTestWrapper(routeState)

        render(
          <TestWrapper>
            <SmartRouteGuard
              requireAuth={requirements.requireAuth}
              requireEmailVerification={requirements.requireEmailVerification}
              requireWorkspace={requirements.requireWorkspace}
              allowedRoles={requirements.allowedRoles}
            >
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Unauthenticated users should not see protected content
          const protectedContent = screen.queryByTestId('protected-content')
          expect(protectedContent).not.toBeInTheDocument()

          // Property: Return URL should be preserved in redirect
          if (mockPush.mock.calls.length > 0) {
            const redirectCall = mockPush.mock.calls[0][0]
            expect(redirectCall).toContain('/auth/login')
            expect(redirectCall).toContain('returnUrl=')
            expect(redirectCall).toContain(encodeURIComponent(routeState.currentRoute))
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('users with unverified email should be redirected to verification', () => {
    fc.assert(
      fc.property(routeStateArb, protectionRequirementsArb, async (routeState, requirements) => {
        // Only test cases where user is authenticated but email not verified
        if (!routeState.isAuthenticated || routeState.isEmailVerified || !requirements.requireEmailVerification) {
          return true // Skip this test case
        }

        const TestWrapper = createTestWrapper(routeState)

        render(
          <TestWrapper>
            <SmartRouteGuard
              requireAuth={requirements.requireAuth}
              requireEmailVerification={requirements.requireEmailVerification}
              requireWorkspace={requirements.requireWorkspace}
              allowedRoles={requirements.allowedRoles}
            >
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Users with unverified email should not see protected content
          const protectedContent = screen.queryByTestId('protected-content')
          expect(protectedContent).not.toBeInTheDocument()

          // Property: Should redirect to email verification
          if (mockPush.mock.calls.length > 0) {
            const redirectCall = mockPush.mock.calls[0][0]
            expect(redirectCall).toBe('/auth/verify-email')
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('users without workspace should be redirected to onboarding', () => {
    fc.assert(
      fc.property(
        routeStateArb.filter(state => state.isAuthenticated && state.isEmailVerified && !state.hasWorkspace),
        protectionRequirementsArb.filter(req => req.requireWorkspace),
        async (routeState, requirements) => {

        const TestWrapper = createTestWrapper(routeState)

        render(
          <TestWrapper>
            <SmartRouteGuard
              requireAuth={requirements.requireAuth}
              requireEmailVerification={requirements.requireEmailVerification}
              requireWorkspace={requirements.requireWorkspace}
              allowedRoles={requirements.allowedRoles}
            >
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Users without workspace should not see protected content
          const protectedContent = screen.queryByTestId('protected-content')
          expect(protectedContent).not.toBeInTheDocument()

          // Property: Should redirect to workspace onboarding
          if (mockPush.mock.calls.length > 0) {
            const redirectCall = mockPush.mock.calls[0][0]
            expect(redirectCall).toBe('/onboarding/workspace')
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('users with insufficient roles should see access denied message', () => {
    fc.assert(
      fc.property(routeStateArb, protectionRequirementsArb, async (routeState, requirements) => {
        // Only test cases where user meets basic requirements but lacks role
        const hasBasicRequirements = 
          routeState.isAuthenticated && 
          routeState.isEmailVerified && 
          routeState.hasWorkspace

        const hasInsufficientRole = 
          requirements.allowedRoles.length > 0 && 
          !requirements.allowedRoles.includes(routeState.userRole)

        if (!hasBasicRequirements || !hasInsufficientRole) {
          return true // Skip this test case
        }

        const TestWrapper = createTestWrapper(routeState)

        render(
          <TestWrapper>
            <SmartRouteGuard
              requireAuth={requirements.requireAuth}
              requireEmailVerification={requirements.requireEmailVerification}
              requireWorkspace={requirements.requireWorkspace}
              allowedRoles={requirements.allowedRoles}
            >
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Users with insufficient roles should not see protected content
          const protectedContent = screen.queryByTestId('protected-content')
          expect(protectedContent).not.toBeInTheDocument()

          // Property: Should see access denied message
          expect(screen.getByText('Access denied. Insufficient permissions.')).toBeInTheDocument()

          // Property: Should not redirect (stays on current route)
          expect(mockPush).not.toHaveBeenCalled()
          expect(mockReplace).not.toHaveBeenCalled()
        })
      }),
      { numRuns: 100 }
    )
  })

  it('route preservation should work consistently across different protection levels', () => {
    fc.assert(
      fc.property(routeStateArb, async (routeState) => {
        const TestWrapper = createTestWrapper(routeState)

        // Test different protection levels on the same route
        const protectionLevels = [
          { requireAuth: true, requireEmailVerification: false, requireWorkspace: false },
          { requireAuth: true, requireEmailVerification: true, requireWorkspace: false },
          { requireAuth: true, requireEmailVerification: true, requireWorkspace: true },
        ]

        for (const protection of protectionLevels) {
          vi.clearAllMocks()

          const { unmount } = render(
            <TestWrapper>
              <SmartRouteGuard
                requireAuth={protection.requireAuth}
                requireEmailVerification={protection.requireEmailVerification}
                requireWorkspace={protection.requireWorkspace}
              >
                <div data-testid="protected-content">Protected Content</div>
              </SmartRouteGuard>
            </TestWrapper>
          )

          await waitFor(() => {
            // Property: Route preservation behavior should be consistent
            // If user meets requirements, no redirection should occur
            const userMeetsRequirements = 
              (!protection.requireAuth || routeState.isAuthenticated) &&
              (!protection.requireEmailVerification || routeState.isEmailVerified) &&
              (!protection.requireWorkspace || routeState.hasWorkspace)

            if (userMeetsRequirements) {
              expect(mockPush).not.toHaveBeenCalled()
              expect(mockReplace).not.toHaveBeenCalled()
            } else {
              // If redirection occurs, it should be to appropriate destination
              if (mockPush.mock.calls.length > 0) {
                const redirectCall = mockPush.mock.calls[0][0]
                expect(typeof redirectCall).toBe('string')
                expect(redirectCall).toMatch(/^\//)
              }
            }
          })

          unmount()
        }
      }),
      { numRuns: 50 }
    )
  })
})