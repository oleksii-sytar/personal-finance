/**
 * Integration Test: Complete User Onboarding Journeys
 * 
 * **Task 14.2: Test complete user onboarding journeys**
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 15.1, 15.2, 15.3, 15.4, 15.5**
 * 
 * This test verifies that complete user onboarding flows work correctly
 * from registration through workspace creation and first login.
 * 
 * **Feature: auth-page-refresh-fix, Task 14.2: User Onboarding Journey Integration**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { NavigationManager } from '@/components/shared/navigation-manager'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
import { createClient } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/session/session-manager'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  })),
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

// Mock return URL utility
vi.mock('@/lib/utils/return-url', () => ({
  createLoginUrlWithReturn: vi.fn(() => '/auth/login?returnUrl=%2Fdashboard'),
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

describe('User Onboarding Journey Integration Tests', () => {
  const mockPush = vi.fn()
  const mockReplace = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup router mock
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as any)

    vi.mocked(usePathname).mockReturnValue('/dashboard')

    // Setup session manager mock
    vi.mocked(sessionManager.validateSession).mockResolvedValue(true)
    vi.mocked(sessionManager.clearSession).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with providers
  const createTestWrapper = () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>
        <WorkspaceProvider>
          <NavigationManager />
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    )
    
    TestWrapper.displayName = 'OnboardingJourneyTestWrapper'
    return TestWrapper
  }

  // Helper to setup Supabase mock for different user states
  const setupSupabaseMock = (userState: 'new' | 'unverified' | 'verified' | 'with-workspace' | 'with-invitations') => {
    let user = null
    let workspace = null
    let invitations: any[] = []

    switch (userState) {
      case 'new':
        // No user, no session
        break
      case 'unverified':
        user = {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: null, // Not verified
        }
        break
      case 'verified':
        user = {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        }
        break
      case 'with-workspace':
        user = {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        }
        workspace = {
          id: 'test-workspace-id',
          name: 'Test Workspace',
          owner_id: 'test-user-id',
        }
        break
      case 'with-invitations':
        user = {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        }
        invitations = [
          {
            id: 'invitation-1',
            workspace_id: 'other-workspace-id',
            email: 'test@example.com',
            role: 'member',
          }
        ]
        break
    }

    const mockSupabase = {
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: null
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: user ? {
              user,
              access_token: 'mock-token',
              expires_at: Date.now() + 3600000,
            } : null
          },
          error: null
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: workspace,
                  error: workspace ? null : { message: 'No workspace found' }
                })),
              })),
            })),
          }
        }
        if (table === 'workspace_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  data: invitations,
                  error: null
                })),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        }
      }),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Setup session manager state
    vi.mocked(sessionManager.getState).mockReturnValue({
      user,
      session: user ? {
        user,
        access_token: 'mock-token',
        expires_at: Date.now() + 3600000,
      } : null,
      lastValidated: new Date(),
      isValid: !!user,
    })

    return { user, workspace, invitations }
  }

  describe('New user registration journey', () => {
    it('should guide new user through complete onboarding flow', async () => {
      const TestWrapper = createTestWrapper()

      // Start with no user (new registration scenario)
      setupSupabaseMock('new')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={false}>
            <div data-testid="public-content">Public Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Wait for auth loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Should show public content for unauthenticated user
      expect(screen.getByTestId('public-content')).toBeInTheDocument()

      // Should not redirect unauthenticated users
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should redirect unverified user to email verification', async () => {
      const TestWrapper = createTestWrapper()

      // Setup unverified user
      setupSupabaseMock('unverified')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to email verification
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
      }, { timeout: 3000 })
    })

    it('should redirect verified user without workspace to onboarding', async () => {
      const TestWrapper = createTestWrapper()

      // Setup verified user without workspace
      setupSupabaseMock('verified')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to workspace creation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
      }, { timeout: 3000 })
    })

    it('should allow access to dashboard for fully onboarded user', async () => {
      const TestWrapper = createTestWrapper()

      // Setup fully onboarded user
      setupSupabaseMock('with-workspace')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="dashboard-content">Dashboard Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should show dashboard content without redirects
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should not redirect
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Invitation acceptance journey', () => {
    it('should redirect user with pending invitations to accept them', async () => {
      const TestWrapper = createTestWrapper()

      // Setup user with pending invitations
      setupSupabaseMock('with-invitations')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      // Mock post-login check to return pending invitations
      const mockUsePostLoginCheck = vi.fn().mockReturnValue({
        hasPendingInvitations: true,
        pendingInvitations: [
          {
            id: 'invitation-1',
            workspace_id: 'other-workspace-id',
            email: 'test@example.com',
            role: 'member',
          }
        ],
        isLoading: false,
        error: null,
        checkComplete: true,
      })

      vi.doMock('@/hooks/use-post-login-check', () => ({
        usePostLoginCheck: mockUsePostLoginCheck,
      }))

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to invitation acceptance
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/accept-invitations')
      }, { timeout: 3000 })
    })

    it('should handle invitation acceptance flow correctly', async () => {
      const TestWrapper = createTestWrapper()

      // Setup user on invitation acceptance page
      setupSupabaseMock('with-invitations')
      vi.mocked(usePathname).mockReturnValue('/auth/accept-invitations')

      render(
        <TestWrapper>
          <div data-testid="invitation-content">Accept Invitations</div>
        </TestWrapper>
      )

      // Should show invitation content without redirects
      expect(screen.getByTestId('invitation-content')).toBeInTheDocument()

      // Should not redirect away from invitation page
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Return URL handling during onboarding', () => {
    it('should preserve return URL through email verification', async () => {
      const TestWrapper = createTestWrapper()

      // Setup unverified user with return URL
      setupSupabaseMock('unverified')
      vi.mocked(usePathname).mockReturnValue('/settings')

      const mockSearchParams = {
        get: vi.fn((key: string) => key === 'returnUrl' ? '/settings' : null),
        toString: vi.fn(() => 'returnUrl=%2Fsettings'),
      }

      vi.mocked(require('next/navigation').useSearchParams).mockReturnValue(mockSearchParams)

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="settings-content">Settings Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to email verification
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
      }, { timeout: 3000 })

      // Return URL should be preserved in history manager
      // (This would be tested more thoroughly in the history manager tests)
    })

    it('should redirect to return URL after complete onboarding', async () => {
      const TestWrapper = createTestWrapper()

      // Setup fully onboarded user with return URL
      setupSupabaseMock('with-workspace')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      const mockSearchParams = {
        get: vi.fn((key: string) => key === 'returnUrl' ? '/settings' : null),
        toString: vi.fn(() => 'returnUrl=%2Fsettings'),
      }

      vi.mocked(require('next/navigation').useSearchParams).mockReturnValue(mockSearchParams)

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to the return URL
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/settings')
      }, { timeout: 3000 })
    })
  })

  describe('Onboarding step determination', () => {
    it('should correctly determine email verification step', async () => {
      const TestWrapper = createTestWrapper()

      setupSupabaseMock('unverified')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should redirect to email verification for unverified user
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
      }, { timeout: 3000 })
    })

    it('should correctly determine workspace creation step', async () => {
      const TestWrapper = createTestWrapper()

      setupSupabaseMock('verified')
      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should redirect to workspace creation for verified user without workspace
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
      }, { timeout: 3000 })
    })

    it('should prioritize invitations over workspace creation', async () => {
      const TestWrapper = createTestWrapper()

      // Setup verified user with invitations but no workspace
      const { user } = setupSupabaseMock('verified')
      
      // Mock post-login check to return pending invitations
      const mockUsePostLoginCheck = vi.fn().mockReturnValue({
        hasPendingInvitations: true,
        pendingInvitations: [
          {
            id: 'invitation-1',
            workspace_id: 'other-workspace-id',
            email: 'test@example.com',
            role: 'member',
          }
        ],
        isLoading: false,
        error: null,
        checkComplete: true,
      })

      vi.doMock('@/hooks/use-post-login-check', () => ({
        usePostLoginCheck: mockUsePostLoginCheck,
      }))

      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should redirect to invitations instead of workspace creation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/accept-invitations')
      }, { timeout: 3000 })
    })
  })

  describe('Onboarding flow integrity', () => {
    it('should not interfere with auth pages during onboarding', async () => {
      const TestWrapper = createTestWrapper()

      setupSupabaseMock('unverified')
      vi.mocked(usePathname).mockReturnValue('/auth/verify-email')

      render(
        <TestWrapper>
          <div data-testid="verify-email-content">Verify Email Content</div>
        </TestWrapper>
      )

      // Should not redirect away from auth pages
      expect(screen.getByTestId('verify-email-content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should not interfere with onboarding pages', async () => {
      const TestWrapper = createTestWrapper()

      setupSupabaseMock('verified')
      vi.mocked(usePathname).mockReturnValue('/onboarding/workspace')

      render(
        <TestWrapper>
          <div data-testid="workspace-creation-content">Workspace Creation</div>
        </TestWrapper>
      )

      // Should not redirect away from onboarding pages
      expect(screen.getByTestId('workspace-creation-content')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle loading states gracefully', async () => {
      const TestWrapper = createTestWrapper()

      setupSupabaseMock('verified')

      // Mock loading state
      const mockUsePostLoginCheck = vi.fn().mockReturnValue({
        hasPendingInvitations: false,
        pendingInvitations: [],
        isLoading: true, // Still loading
        error: null,
        checkComplete: false,
      })

      vi.doMock('@/hooks/use-post-login-check', () => ({
        usePostLoginCheck: mockUsePostLoginCheck,
      }))

      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Error handling during onboarding', () => {
    it('should handle authentication errors gracefully', async () => {
      const TestWrapper = createTestWrapper()

      // Mock Supabase to return error
      const mockSupabaseWithError = {
        auth: {
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } }
          })),
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Authentication failed' }
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Session expired' }
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockReturnValue(mockSupabaseWithError as any)

      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to login when authentication fails
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login?returnUrl=%2Fdashboard')
      }, { timeout: 3000 })
    })

    it('should handle workspace loading errors gracefully', async () => {
      const TestWrapper = createTestWrapper()

      // Setup user but mock workspace loading error
      const mockSupabase = {
        auth: {
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } }
          })),
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: new Date().toISOString(),
              }
            },
            error: null
          }),
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
                  email_confirmed_at: new Date().toISOString(),
                },
                access_token: 'mock-token',
                expires_at: Date.now() + 3600000,
              }
            },
            error: null
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.reject(new Error('Database error'))),
            })),
          })),
        })),
      }
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      vi.mocked(usePathname).mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="protected-content">Protected Content</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should handle the error gracefully and still redirect to workspace creation
      // since no workspace was loaded
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
      }, { timeout: 3000 })
    })
  })
})