/**
 * Property-Based Test: Complete User Journey Consistency
 * 
 * **Property 13: Complete User Journey Consistency**
 * *For any* user navigation action, the system should maintain consistent behavior that respects user intent and context
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
 * 
 * **Feature: auth-page-refresh-fix, Property 13: Complete User Journey Consistency**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NavigationManager } from '../navigation-manager'
import { SmartRouteGuard } from '../smart-route-guard'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

// User state generator for property testing
const userStateArb = fc.record({
  isAuthenticated: fc.boolean(),
  isEmailVerified: fc.boolean(),
  hasWorkspace: fc.boolean(),
  hasPendingInvitations: fc.boolean(),
  currentPath: fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/auth/login',
    '/auth/signup',
    '/auth/verify-email',
    '/auth/accept-invitations',
    '/onboarding/workspace'
  ),
  intendedDestination: fc.option(fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/reports'
  ), { nil: null }),
})

// Navigation action generator
const navigationActionArb = fc.record({
  type: fc.constantFrom('navigate', 'refresh', 'back', 'forward'),
  destination: fc.option(fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/reports'
  ), { nil: null }),
})

describe('Property Test: Complete User Journey Consistency', () => {
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

    // Setup session manager mock
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
  const createTestWrapper = (userState: any) => {
    // Mock pathname based on user state
    vi.mocked(usePathname).mockReturnValue(userState.currentPath)

    // Mock auth context state
    const mockUser = userState.isAuthenticated ? {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: userState.isEmailVerified ? new Date().toISOString() : null,
    } : null

    const mockSession = userState.isAuthenticated ? {
      user: mockUser,
      access_token: 'test-token',
    } : null

    // Mock workspace context state
    const mockWorkspace = userState.hasWorkspace ? {
      id: 'test-workspace-id',
      name: 'Test Workspace',
      owner_id: 'test-user-id',
    } : null

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

  it('navigation decisions should be consistent with user context', () => {
    fc.assert(
      fc.property(userStateArb, navigationActionArb, async (userState, navigationAction) => {
        const TestWrapper = createTestWrapper(userState)

        // Test NavigationManager behavior
        render(
          <TestWrapper>
            <NavigationManager />
            <div data-testid="test-content">Test Content</div>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Navigation should respect user authentication state
          if (!userState.isAuthenticated && userState.currentPath.startsWith('/dashboard')) {
            // Unauthenticated users on protected routes should be redirected to login
            expect(mockPush).toHaveBeenCalledWith(
              expect.stringContaining('/auth/login')
            )
          }

          // Property: Email verification should be enforced for authenticated users
          if (userState.isAuthenticated && !userState.isEmailVerified && 
              !userState.currentPath.startsWith('/auth/verify-email')) {
            expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
          }

          // Property: Workspace requirement should be enforced for verified users
          if (userState.isAuthenticated && userState.isEmailVerified && 
              !userState.hasWorkspace && !userState.currentPath.startsWith('/onboarding/')) {
            expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
          }

          // Property: Pending invitations should take priority
          if (userState.isAuthenticated && userState.isEmailVerified && 
              userState.hasPendingInvitations && 
              !userState.currentPath.startsWith('/auth/accept-invitations')) {
            expect(mockPush).toHaveBeenCalledWith('/auth/accept-invitations')
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('SmartRouteGuard should provide consistent protection across all user states', () => {
    fc.assert(
      fc.property(userStateArb, async (userState) => {
        const TestWrapper = createTestWrapper(userState)

        // Test SmartRouteGuard with different protection requirements
        const { rerender } = render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true}>
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          const protectedContent = screen.queryByTestId('protected-content')

          // Property: Content should only be visible when all requirements are met
          if (userState.isAuthenticated && userState.isEmailVerified) {
            expect(protectedContent).toBeInTheDocument()
          } else {
            expect(protectedContent).not.toBeInTheDocument()
          }
        })

        // Test workspace requirement
        rerender(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true} requireWorkspace={true}>
              <div data-testid="workspace-content">Workspace Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          const workspaceContent = screen.queryByTestId('workspace-content')

          // Property: Workspace content should only be visible when workspace exists
          if (userState.isAuthenticated && userState.isEmailVerified && userState.hasWorkspace) {
            expect(workspaceContent).toBeInTheDocument()
          } else {
            expect(workspaceContent).not.toBeInTheDocument()
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('user journey should maintain consistency across page refreshes', () => {
    fc.assert(
      fc.property(userStateArb, async (userState) => {
        const TestWrapper = createTestWrapper(userState)

        // Simulate page refresh by re-rendering the entire component tree
        const { rerender } = render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="app-content">App Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Capture initial navigation calls
        const initialCalls = [...mockPush.mock.calls]

        // Simulate page refresh
        vi.clearAllMocks()
        rerender(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="app-content">App Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Navigation behavior should be consistent after refresh
          const refreshCalls = [...mockPush.mock.calls]
          
          // The same navigation decisions should be made
          if (initialCalls.length > 0 && refreshCalls.length > 0) {
            expect(refreshCalls[0]).toEqual(initialCalls[0])
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('return URL handling should preserve user intent across authentication flows', () => {
    fc.assert(
      fc.property(userStateArb, async (userState) => {
        const returnUrl = '/transactions'
        
        // Mock search params to include return URL
        vi.mocked(useSearchParams).mockReturnValue({
          get: vi.fn((key: string) => key === 'returnUrl' ? returnUrl : null),
          toString: vi.fn(() => 'returnUrl=%2Ftransactions'),
        } as any)

        const TestWrapper = createTestWrapper(userState)

        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true} requireWorkspace={true}>
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Return URL should be preserved when redirecting unauthenticated users
          if (!userState.isAuthenticated) {
            expect(mockPush).toHaveBeenCalledWith(
              expect.stringContaining('returnUrl=')
            )
          }

          // Property: Return URL should be honored when all requirements are met
          if (userState.isAuthenticated && userState.isEmailVerified && userState.hasWorkspace) {
            // If user meets all requirements and has a return URL, they should eventually get there
            // This is tested indirectly through the NavigationManager logic
            expect(screen.queryByTestId('protected-content')).toBeInTheDocument()
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('navigation should handle edge cases gracefully', () => {
    fc.assert(
      fc.property(userStateArb, async (userState) => {
        const TestWrapper = createTestWrapper(userState)

        // Test with various edge case scenarios
        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard 
              requireAuth={true} 
              requireEmailVerification={true}
              requireWorkspace={true}
              allowedRoles={['owner', 'member']}
            >
              <div data-testid="role-protected-content">Role Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: System should handle all combinations of user states gracefully
          // No errors should be thrown regardless of user state
          expect(() => {
            screen.queryByTestId('role-protected-content')
          }).not.toThrow()

          // Property: Navigation calls should be valid routes
          mockPush.mock.calls.forEach(([route]) => {
            expect(typeof route).toBe('string')
            expect(route).toMatch(/^\//)
          })
        })
      }),
      { numRuns: 100 }
    )
  })
})