/**
 * Integration Test: Page Refresh Behavior
 * 
 * **Task 13.1: Test page refresh on all major routes**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test verifies that page refresh preserves the current route across
 * all major application routes, ensuring the authentication fix works correctly.
 * 
 * **Feature: auth-page-refresh-fix, Task 13.1: Page Refresh Route Preservation**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { HistoryProvider } from '@/components/shared/history-provider'
import { BookmarkHandler } from '@/components/shared/bookmark-handler'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
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

describe('Page Refresh Behavior Integration Tests', () => {
  const mockPush = vi.fn()
  const mockReplace = vi.fn()
  const mockRefresh = vi.fn()

  // Test routes that should preserve their location on refresh
  const protectedRoutes = [
    '/dashboard',
    '/transactions',
    '/settings',
    '/reports',
    '/categories',
  ]

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

    // Setup authenticated user mock
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
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-workspace-id',
                name: 'Test Workspace',
                owner_id: 'test-user-id',
              },
              error: null
            })),
          })),
        })),
      })),
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Setup session manager mock with proper authenticated state
    vi.mocked(sessionManager.validateSession).mockResolvedValue(true)
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        },
        access_token: 'mock-token',
        expires_at: Date.now() + 3600000,
      },
      lastValidated: new Date(),
      isValid: true,
    })
    vi.mocked(sessionManager.clearSession).mockResolvedValue(undefined)

    // Mock document.referrer for bookmark detection
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
    })

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
  const createTestWrapper = (currentRoute: string) => {
    // Mock pathname for the current route
    vi.mocked(usePathname).mockReturnValue(currentRoute)

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
    
    TestWrapper.displayName = 'PageRefreshTestWrapper'
    return TestWrapper
  }

  describe('Task 13.1: Page refresh preserves route on all major routes', () => {
    protectedRoutes.forEach((route) => {
      it(`should preserve ${route} route on page refresh`, async () => {
        const TestWrapper = createTestWrapper(route)

        // Simulate page refresh by rendering with bookmark access (no referrer)
        Object.defineProperty(document, 'referrer', {
          value: '',
          writable: true,
        })

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="protected-content">
                Current Route: {route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Wait for authentication and route guard to process
        await waitFor(() => {
          expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Verify the content shows the correct route
        expect(screen.getByText(`Current Route: ${route}`)).toBeInTheDocument()

        // Verify no unexpected redirects occurred
        expect(mockPush).not.toHaveBeenCalledWith('/auth/login')
        expect(mockReplace).not.toHaveBeenCalledWith('/auth/login')
        
        // Should not redirect to dashboard from other routes
        if (route !== '/dashboard') {
          expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
          expect(mockReplace).not.toHaveBeenCalledWith('/dashboard')
        }
      })

      it(`should handle ${route} refresh with authentication check`, async () => {
        const TestWrapper = createTestWrapper(route)

        // Simulate page refresh scenario
        Object.defineProperty(document, 'referrer', {
          value: '',
          writable: true,
        })

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true} requireEmailVerification={true}>
              <div data-testid="route-content">
                Protected content for {route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Should show protected content after authentication check
        await waitFor(() => {
          expect(screen.getByTestId('route-content')).toBeInTheDocument()
        }, { timeout: 3000 })

        // Verify authentication was checked but route was preserved
        expect(screen.getByText(`Protected content for ${route}`)).toBeInTheDocument()
        
        // Should not redirect away from the intended route
        expect(mockPush).not.toHaveBeenCalledWith('/auth/login')
        expect(mockReplace).not.toHaveBeenCalledWith('/auth/login')
      })
    })
  })

  describe('Authentication component isolation on page refresh', () => {
    protectedRoutes.forEach((route) => {
      it(`should not instantiate auth components on ${route} refresh`, async () => {
        const TestWrapper = createTestWrapper(route)

        // Mock console.log to track component instantiation
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="non-auth-content">
                Non-auth page: {route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByTestId('non-auth-content')).toBeInTheDocument()
        })

        // Verify no auth component instantiation logs
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

        consoleSpy.mockRestore()
      })
    })
  })

  describe('Bookmark and direct URL access', () => {
    protectedRoutes.forEach((route) => {
      it(`should handle direct URL access to ${route}`, async () => {
        const TestWrapper = createTestWrapper(route)

        // Simulate direct URL access (bookmark or typed URL)
        Object.defineProperty(document, 'referrer', {
          value: '',
          writable: true,
        })

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="bookmarked-content">
                Bookmarked page: {route}
              </div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Should show the bookmarked content after authentication
        await waitFor(() => {
          expect(screen.getByTestId('bookmarked-content')).toBeInTheDocument()
        }, { timeout: 3000 })

        expect(screen.getByText(`Bookmarked page: ${route}`)).toBeInTheDocument()

        // Should not redirect away from bookmarked route
        expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
        expect(mockReplace).not.toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Browser history preservation', () => {
    it('should maintain browser history state across page refresh', async () => {
      const route = '/transactions'
      const TestWrapper = createTestWrapper(route)

      // Mock history state
      Object.defineProperty(window, 'history', {
        value: {
          pushState: vi.fn(),
          replaceState: vi.fn(),
          back: vi.fn(),
          forward: vi.fn(),
          state: {
            returnUrl: '/settings',
            preserveHistory: true,
            timestamp: Date.now(),
          },
        },
        writable: true,
      })

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="history-content">
              Content with history: {route}
            </div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('history-content')).toBeInTheDocument()
      })

      // Verify history state is preserved
      expect(window.history.state).toEqual(
        expect.objectContaining({
          returnUrl: '/settings',
          preserveHistory: true,
        })
      )

      // Should not interfere with history
      expect(mockPush).not.toHaveBeenCalled()
      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  describe('Error scenarios during page refresh', () => {
    it('should handle authentication errors gracefully during refresh', async () => {
      const route = '/dashboard'
      const TestWrapper = createTestWrapper(route)

      // Mock authentication error
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

      render(
        <TestWrapper>
          <SmartRouteGuard requireAuth={true}>
            <div data-testid="error-content">Should not show</div>
          </SmartRouteGuard>
        </TestWrapper>
      )

      // Should redirect to login when authentication fails
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      }, { timeout: 3000 })

      // Should not show protected content
      expect(screen.queryByTestId('error-content')).not.toBeInTheDocument()
    })
  })
})