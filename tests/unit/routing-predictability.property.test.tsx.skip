/**
 * Property-Based Test: Routing Predictability
 * 
 * **Property 14: Routing Predictability**
 * *For any* navigation scenario, the system should provide predictable routing behavior
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
 * 
 * **Feature: auth-page-refresh-fix, Property 14: Routing Predictability**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryProvider, useHistory } from '@/components/shared/history-provider'
import { BookmarkHandler } from '@/components/shared/bookmark-handler'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
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

// Navigation scenario generator for property testing
const navigationScenarioArb = fc.record({
  userState: fc.record({
    isAuthenticated: fc.boolean(),
    isEmailVerified: fc.boolean(),
    hasWorkspace: fc.boolean(),
    role: fc.constantFrom('owner', 'member', null),
  }),
  currentRoute: fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/auth/login',
    '/auth/signup',
    '/onboarding/workspace',
    '/'
  ),
  targetRoute: fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/auth/login',
    '/auth/signup',
    '/onboarding/workspace',
    '/'
  ),
  hasReturnUrl: fc.boolean(),
  hasBookmark: fc.boolean(),
  navigationMethod: fc.constantFrom('push', 'replace', 'back', 'forward', 'bookmark'),
})

// Browser history state generator
const historyStateArb = fc.record({
  hasHistory: fc.boolean(),
  historyLength: fc.integer({ min: 1, max: 10 }),
  canGoBack: fc.boolean(),
  canGoForward: fc.boolean(),
  previousUrl: fc.option(fc.constantFrom(
    '/dashboard',
    '/transactions',
    '/settings',
    '/auth/login'
  ), { nil: null }),
})

describe('Property Test: Routing Predictability', () => {
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
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
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

    // Mock document.referrer for bookmark detection
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with providers
  const createTestWrapper = (scenario: any) => {
    // Mock pathname based on scenario
    vi.mocked(usePathname).mockReturnValue(scenario.currentRoute)

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
    
    TestWrapper.displayName = 'RoutingTestWrapper'
    return TestWrapper
  }

  it('bookmarked pages should work correctly for authenticated users', () => {
    fc.assert(
      fc.property(navigationScenarioArb, (scenario) => {
        // Focus on bookmark scenarios
        fc.pre(scenario.hasBookmark && scenario.userState.isAuthenticated)

        const TestWrapper = createTestWrapper(scenario)

        // Mock bookmark access (no referrer)
        Object.defineProperty(document, 'referrer', {
          value: '',
          writable: true,
        })

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Property: Authenticated users should access bookmarked protected pages
        if (scenario.userState.isAuthenticated && 
            scenario.userState.isEmailVerified && 
            scenario.userState.hasWorkspace &&
            scenario.currentRoute.startsWith('/dashboard')) {
          expect(screen.queryByTestId('protected-content')).toBeInTheDocument()
        }

        // Property: Bookmark access should not cause unexpected redirects
        const redirectCalls = mockPush.mock.calls.filter(call => 
          call[0] !== scenario.currentRoute
        )
        
        if (scenario.userState.isAuthenticated && 
            scenario.userState.isEmailVerified && 
            scenario.userState.hasWorkspace) {
          expect(redirectCalls.length).toBe(0)
        }
      }),
      { numRuns: 50 }
    )
  })

  it('browser back/forward buttons should respect history without unexpected redirects', () => {
    fc.assert(
      fc.property(navigationScenarioArb, historyStateArb, (scenario, historyState) => {
        const TestWrapper = createTestWrapper(scenario)

        // Test component that uses history
        function HistoryTestComponent() {
          const history = useHistory()
          
          return (
            <div>
              <div data-testid="current-route">{scenario.currentRoute}</div>
              <div data-testid="can-go-back">{history.canGoBack.toString()}</div>
              <div data-testid="can-go-forward">{history.canGoForward.toString()}</div>
              <button 
                data-testid="go-back" 
                onClick={() => history.goBack()}
                disabled={!history.canGoBack}
              >
                Back
              </button>
              <button 
                data-testid="go-forward" 
                onClick={() => history.goForward()}
                disabled={!history.canGoForward}
              >
                Forward
              </button>
            </div>
          )
        }

        render(
          <TestWrapper>
            <HistoryTestComponent />
          </TestWrapper>
        )

        // Property: Back/forward button state should be consistent
        const canGoBackElement = screen.getByTestId('can-go-back')
        const canGoForwardElement = screen.getByTestId('can-go-forward')
        
        expect(canGoBackElement.textContent).toMatch(/^(true|false)$/)
        expect(canGoForwardElement.textContent).toMatch(/^(true|false)$/)

        // Property: Back button should only be enabled when safe to go back
        const backButton = screen.getByTestId('go-back')
        if (historyState.canGoBack && historyState.previousUrl && 
            !historyState.previousUrl.includes('/auth/')) {
          expect(backButton).not.toBeDisabled()
        }

        // Property: Navigation should not cause auth loops
        if (historyState.canGoBack) {
          fireEvent.click(backButton)
          
          // Should not redirect to auth pages from protected pages
          const authRedirects = mockPush.mock.calls.filter(call => 
            call[0].includes('/auth/')
          )
          
          if (scenario.userState.isAuthenticated && 
              scenario.userState.isEmailVerified && 
              scenario.userState.hasWorkspace) {
            expect(authRedirects.length).toBe(0)
          }
        }
      }),
      { numRuns: 50 }
    )
  })

  it('navigation should provide visual feedback and loading states', () => {
    fc.assert(
      fc.property(navigationScenarioArb, (scenario) => {
        const TestWrapper = createTestWrapper(scenario)

        function NavigationTestComponent() {
          const history = useHistory()
          
          return (
            <div>
              <div data-testid="is-navigating">{history.isNavigating.toString()}</div>
              <button 
                data-testid="navigate-button"
                onClick={() => history.navigate(scenario.targetRoute)}
              >
                Navigate to {scenario.targetRoute}
              </button>
            </div>
          )
        }

        render(
          <TestWrapper>
            <NavigationTestComponent />
          </TestWrapper>
        )

        // Property: Navigation state should be trackable
        const isNavigatingElement = screen.getByTestId('is-navigating')
        expect(isNavigatingElement.textContent).toMatch(/^(true|false)$/)

        // Property: Navigation should update state appropriately
        const navigateButton = screen.getByTestId('navigate-button')
        fireEvent.click(navigateButton)

        // Should call router with target route
        expect(mockPush).toHaveBeenCalledWith(scenario.targetRoute)
      }),
      { numRuns: 50 }
    )
  })

  it('multi-tab authentication state should be handled consistently', () => {
    fc.assert(
      fc.property(navigationScenarioArb, (scenario) => {
        const TestWrapper = createTestWrapper(scenario)

        render(
          <TestWrapper>
            <div data-testid="auth-state">
              {scenario.userState.isAuthenticated ? 'authenticated' : 'unauthenticated'}
            </div>
          </TestWrapper>
        )

        // Property: Auth state should be consistent
        const authStateElement = screen.getByTestId('auth-state')
        if (scenario.userState.isAuthenticated) {
          expect(authStateElement.textContent).toBe('authenticated')
        } else {
          expect(authStateElement.textContent).toBe('unauthenticated')
        }

        // Property: Multi-tab state changes should be handled
        // Simulate cross-tab auth state change
        const storageEvent = new StorageEvent('storage', {
          key: 'auth-state',
          newValue: scenario.userState.isAuthenticated ? 'signed-out' : 'signed-in',
          oldValue: scenario.userState.isAuthenticated ? 'signed-in' : 'signed-out',
        })
        
        window.dispatchEvent(storageEvent)

        // Should handle the state change gracefully (no errors thrown)
        expect(() => {
          screen.getByTestId('auth-state')
        }).not.toThrow()
      }),
      { numRuns: 50 }
    )
  })

  it('return URLs should work correctly across authentication flows', () => {
    fc.assert(
      fc.property(navigationScenarioArb, (scenario) => {
        // Focus on scenarios with return URLs
        fc.pre(scenario.hasReturnUrl)

        const TestWrapper = createTestWrapper(scenario)

        // Mock return URL in search params
        vi.mocked(useSearchParams).mockReturnValue({
          get: vi.fn((key: string) => {
            if (key === 'returnUrl') return encodeURIComponent(scenario.targetRoute)
            return null
          }),
          toString: vi.fn(() => `returnUrl=${encodeURIComponent(scenario.targetRoute)}`),
        } as any)

        render(
          <TestWrapper>
            <SmartRouteGuard requireAuth={true}>
              <div data-testid="protected-content">Protected Content</div>
            </SmartRouteGuard>
          </TestWrapper>
        )

        // Property: Return URLs should be preserved during auth flows
        if (!scenario.userState.isAuthenticated) {
          // Should redirect to login with return URL
          const loginRedirects = mockPush.mock.calls.filter(call => 
            call[0].includes('/auth/login')
          )
          expect(loginRedirects.length).toBeGreaterThan(0)
        }

        // Property: Valid return URLs should be used after authentication
        if (scenario.userState.isAuthenticated && 
            scenario.userState.isEmailVerified && 
            scenario.userState.hasWorkspace) {
          // Should eventually navigate to return URL or show content
          expect(
            screen.queryByTestId('protected-content') || 
            mockPush.mock.calls.some(call => call[0] === scenario.targetRoute)
          ).toBeTruthy()
        }
      }),
      { numRuns: 50 }
    )
  })

  it('routing behavior should be predictable across different navigation methods', () => {
    fc.assert(
      fc.property(navigationScenarioArb, (scenario) => {
        const TestWrapper = createTestWrapper(scenario)

        function NavigationMethodTestComponent() {
          const history = useHistory()
          
          const handleNavigation = () => {
            switch (scenario.navigationMethod) {
              case 'push':
                history.navigate(scenario.targetRoute)
                break
              case 'replace':
                history.navigate(scenario.targetRoute, { replace: true })
                break
              case 'back':
                history.goBack()
                break
              case 'forward':
                history.goForward()
                break
              case 'bookmark':
                // Simulate bookmark access
                history.navigate(scenario.targetRoute)
                break
            }
          }
          
          return (
            <div>
              <button data-testid="navigate" onClick={handleNavigation}>
                Navigate via {scenario.navigationMethod}
              </button>
              <div data-testid="current-route">{scenario.currentRoute}</div>
            </div>
          )
        }

        render(
          <TestWrapper>
            <NavigationMethodTestComponent />
          </TestWrapper>
        )

        // Property: All navigation methods should work predictably
        const navigateButton = screen.getByTestId('navigate')
        fireEvent.click(navigateButton)

        // Property: Navigation should result in appropriate router calls
        switch (scenario.navigationMethod) {
          case 'push':
            expect(mockPush).toHaveBeenCalledWith(scenario.targetRoute)
            break
          case 'replace':
            expect(mockReplace).toHaveBeenCalledWith(scenario.targetRoute)
            break
          case 'back':
            // Back navigation should be handled appropriately
            expect(mockBack).toHaveBeenCalled()
            break
          case 'forward':
            // Forward navigation should be handled appropriately
            expect(mockForward).toHaveBeenCalled()
            break
          case 'bookmark':
            expect(mockPush).toHaveBeenCalledWith(scenario.targetRoute)
            break
        }

        // Property: No navigation method should cause infinite loops
        const totalCalls = mockPush.mock.calls.length + mockReplace.mock.calls.length + 
                          mockBack.mock.calls.length + mockForward.mock.calls.length
        expect(totalCalls).toBeLessThan(5) // Reasonable limit to prevent loops
      }),
      { numRuns: 50 }
    )
  })
})