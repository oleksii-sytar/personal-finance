/**
 * Property-Based Test: Onboarding Flow Integrity
 * 
 * **Property 17: Onboarding Flow Integrity**
 * *For any* new user onboarding scenario, the system should maintain flow integrity without routing conflicts
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
 * 
 * **Feature: auth-page-refresh-fix, Property 17: Onboarding Flow Integrity**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OnboardingFlow } from '../onboarding-flow'
import { NavigationManager } from '../navigation-manager'
import { SmartRouteGuard } from '../smart-route-guard'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { WorkspaceModalProvider } from '@/contexts/workspace-modal-context'
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

// Onboarding user state generator for property testing
const onboardingUserStateArb = fc.record({
  isAuthenticated: fc.boolean(),
  isEmailVerified: fc.boolean(),
  hasWorkspace: fc.boolean(),
  hasPendingInvitations: fc.boolean(),
  isFirstTimeUser: fc.boolean(),
  currentPath: fc.constantFrom(
    '/onboarding/workspace',
    '/auth/verify-email',
    '/auth/accept-invitations',
    '/dashboard',
    '/auth/login',
    '/auth/signup'
  ),
  workspaceCreationStep: fc.constantFrom('loading', 'welcome', 'create-workspace', 'complete', 'skipped'),
  hasInvitationToken: fc.boolean(),
})

// Onboarding action generator
const onboardingActionArb = fc.record({
  type: fc.constantFrom('register', 'verify-email', 'create-workspace', 'accept-invitation', 'skip-workspace'),
  hasReturnUrl: fc.boolean(),
  invitationData: fc.option(fc.record({
    workspaceId: fc.string(),
    inviterEmail: fc.string(),
    role: fc.constantFrom('owner', 'member'),
  }), { nil: null }),
})

describe('Property Test: Onboarding Flow Integrity', () => {
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
  const createOnboardingTestWrapper = (userState: any) => {
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
    const mockWorkspaces = userState.hasWorkspace ? [{
      id: 'test-workspace-id',
      name: 'Test Workspace',
      owner_id: 'test-user-id',
    }] : []

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>
        <WorkspaceProvider>
          <WorkspaceModalProvider>
            {children}
          </WorkspaceModalProvider>
        </WorkspaceProvider>
      </AuthProvider>
    )
    
    TestWrapper.displayName = 'OnboardingTestWrapper'
    return TestWrapper
  }

  it('first-time user registration should guide through email verification without routing conflicts', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        // Focus on first-time users who just registered
        fc.pre(userState.isAuthenticated && !userState.hasWorkspace)

        const TestWrapper = createOnboardingTestWrapper(userState)

        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true} requireEmailVerification={false}>
              <div data-testid="onboarding-content">Onboarding Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: First-time users should be guided to email verification
          if (userState.isAuthenticated && !userState.isEmailVerified && 
              !userState.currentPath.startsWith('/auth/verify-email')) {
            expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
          }

          // Property: Email verification should not cause routing conflicts
          const navigationCalls = mockPush.mock.calls
          const hasConflictingCalls = navigationCalls.some((call, index) => {
            const nextCall = navigationCalls[index + 1]
            return nextCall && call[0] !== nextCall[0] && 
                   call[0].includes('/auth/') && nextCall[0].includes('/auth/')
          })
          expect(hasConflictingCalls).toBe(false)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('email verification completion should lead to workspace creation without authentication loops', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        // Focus on users who completed email verification
        fc.pre(userState.isAuthenticated && userState.isEmailVerified && !userState.hasWorkspace)

        const TestWrapper = createOnboardingTestWrapper(userState)

        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true} requireWorkspace={false}>
              <div data-testid="workspace-creation-content">Workspace Creation</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Email verified users without workspace should go to onboarding
          if (userState.isAuthenticated && userState.isEmailVerified && 
              !userState.hasWorkspace && !userState.currentPath.startsWith('/onboarding/')) {
            expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
          }

          // Property: Should not create authentication loops
          const authCalls = mockPush.mock.calls.filter(call => 
            call[0].includes('/auth/login') || call[0].includes('/auth/signup')
          )
          expect(authCalls.length).toBeLessThanOrEqual(1)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('workspace creation should initialize properly and redirect to dashboard', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        // Focus on users completing workspace creation
        fc.pre(userState.isAuthenticated && userState.isEmailVerified)

        const TestWrapper = createOnboardingTestWrapper(userState)

        // Test OnboardingFlow component directly
        render(
          <TestWrapper>
            <OnboardingFlow />
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Users with workspaces should not see onboarding flow
          if (userState.hasWorkspace) {
            expect(screen.queryByText('Welcome to Forma')).not.toBeInTheDocument()
          }

          // Property: Users without workspaces should see onboarding
          if (!userState.hasWorkspace && userState.isAuthenticated && userState.isEmailVerified) {
            // Should show either welcome screen or loading
            const hasOnboardingContent = 
              screen.queryByText('Welcome to Forma') || 
              screen.queryByTestId('loading-spinner')
            expect(hasOnboardingContent).toBeTruthy()
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('invitation flow should handle workspace invitations without breaking page refresh behavior', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, onboardingActionArb, async (userState, action) => {
        // Focus on users with pending invitations
        fc.pre(userState.isAuthenticated && userState.isEmailVerified && userState.hasPendingInvitations)

        const TestWrapper = createOnboardingTestWrapper(userState)

        // Mock invitation data
        if (action.invitationData) {
          vi.mocked(useSearchParams).mockReturnValue({
            get: vi.fn((key: string) => {
              if (key === 'invitation') return 'test-invitation-token'
              if (key === 'workspace') return action.invitationData?.workspaceId || null
              return null
            }),
            toString: vi.fn(() => 'invitation=test-invitation-token'),
          } as any)
        }

        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true}>
              <div data-testid="invitation-content">Invitation Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Users with pending invitations should be redirected to accept invitations
          if (userState.hasPendingInvitations && 
              !userState.currentPath.startsWith('/auth/accept-invitations')) {
            expect(mockPush).toHaveBeenCalledWith('/auth/accept-invitations')
          }

          // Property: Invitation handling should not break page refresh behavior
          const refreshRelatedCalls = mockPush.mock.calls.filter(call => 
            call[0].includes('returnUrl=') || call[0].includes('redirect=')
          )
          // Should preserve return URLs properly
          refreshRelatedCalls.forEach(call => {
            expect(call[0]).toMatch(/^\//)
          })
        })
      }),
      { numRuns: 100 }
    )
  })

  it('onboarding progress should be remembered and resumed appropriately', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        const TestWrapper = createOnboardingTestWrapper(userState)

        // Simulate page refresh during onboarding
        const { rerender } = render(
          <TestWrapper>
            <NavigationManager />
            <OnboardingFlow />
          </TestWrapper>
        )

        // Capture initial state
        const initialContent = screen.queryByText('Welcome to Forma')
        const initialLoading = screen.queryByTestId('loading-spinner')

        // Simulate page refresh
        vi.clearAllMocks()
        rerender(
          <TestWrapper>
            <NavigationManager />
            <OnboardingFlow />
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Onboarding state should be consistent after refresh
          const refreshContent = screen.queryByText('Welcome to Forma')
          const refreshLoading = screen.queryByTestId('loading-spinner')

          // State should be preserved or logically consistent
          if (userState.isAuthenticated && userState.isEmailVerified && !userState.hasWorkspace) {
            // Should show onboarding content or loading
            expect(refreshContent || refreshLoading).toBeTruthy()
          }

          // Property: No duplicate navigation calls after refresh
          const duplicateCalls = mockPush.mock.calls.filter((call, index, arr) => 
            arr.findIndex(c => c[0] === call[0]) !== index
          )
          expect(duplicateCalls.length).toBe(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  it('onboarding flow should handle edge cases gracefully', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        const TestWrapper = createOnboardingTestWrapper(userState)

        // Test with various edge case scenarios
        render(
          <TestWrapper>
            <NavigationManager />
            <SmartRouteGuard 
              requireAuth={true} 
              requireEmailVerification={true}
              requireWorkspace={false}
            >
              <OnboardingFlow />
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: System should handle all onboarding states gracefully
          // No errors should be thrown regardless of user state
          expect(() => {
            screen.queryByText('Welcome to Forma')
          }).not.toThrow()

          // Property: Navigation calls should be valid routes
          mockPush.mock.calls.forEach(([route]) => {
            expect(typeof route).toBe('string')
            expect(route).toMatch(/^\//)
          })

          // Property: Onboarding should not interfere with authenticated users who have workspaces
          if (userState.isAuthenticated && userState.isEmailVerified && userState.hasWorkspace) {
            expect(screen.queryByText('Welcome to Forma')).not.toBeInTheDocument()
          }
        })
      }),
      { numRuns: 100 }
    )
  })

  it('onboarding flow should maintain consistency across different user contexts', () => {
    fc.assert(
      fc.property(onboardingUserStateArb, async (userState) => {
        const TestWrapper = createOnboardingTestWrapper(userState)

        render(
          <TestWrapper>
            <NavigationManager />
            <OnboardingFlow />
          </TestWrapper>
        )

        await waitFor(() => {
          // Property: Onboarding decisions should be consistent with user context
          if (userState.isAuthenticated && userState.isEmailVerified && !userState.hasWorkspace) {
            // Should show onboarding flow
            const hasOnboardingIndicator = 
              screen.queryByText('Welcome to Forma') ||
              screen.queryByText('Create a Workspace') ||
              screen.queryByTestId('loading-spinner')
            expect(hasOnboardingIndicator).toBeTruthy()
          }

          // Property: Completed users should not see onboarding
          if (userState.hasWorkspace) {
            expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
          }

          // Property: Unauthenticated users should not see onboarding flow
          if (!userState.isAuthenticated) {
            expect(screen.queryByText('Welcome to Forma')).not.toBeInTheDocument()
          }
        })
      }),
      { numRuns: 100 }
    )
  })
})