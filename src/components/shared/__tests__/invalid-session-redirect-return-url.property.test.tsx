/**
 * Property-Based Test: Invalid Session Redirect with Return URL
 * 
 * **Property 11: Invalid Session Redirect with Return URL**
 * *For any* invalid session on a protected route refresh, the system should redirect to login while preserving the intended destination
 * **Validates: Requirements 5.3, 7.3, 8.3**
 * 
 * **Feature: auth-page-refresh-fix, Property 11: Invalid Session Redirect with Return URL**
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
import { 
  isValidReturnUrl, 
  extractReturnUrl, 
  createLoginUrlWithReturn 
} from '@/lib/utils/return-url'

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

// Session state generator for property testing
const sessionStateArb = fc.record({
  isValid: fc.boolean(),
  isExpired: fc.boolean(),
  hasUser: fc.boolean(),
  sessionAge: fc.integer({ min: 0, max: 86400000 }), // 0 to 24 hours in ms
  lastValidated: fc.date(),
})

// Protected route generator
const protectedRouteArb = fc.constantFrom(
  '/dashboard',
  '/transactions',
  '/settings',
  '/reports',
  '/budget',
  '/categories',
  '/accounts'
)

// Return URL scenarios generator
const returnUrlScenarioArb = fc.record({
  hasReturnUrl: fc.boolean(),
  returnUrlPath: protectedRouteArb,
  hasSearchParams: fc.boolean(),
  searchParams: fc.constantFrom('', '?filter=recent', '?page=2', '?category=food'),
  isValidUrl: fc.boolean(),
})

// Session invalidation reasons generator
const invalidationReasonArb = fc.constantFrom(
  'expired',
  'revoked',
  'invalid_token',
  'network_error',
  'server_error'
)

describe('Property Test: Invalid Session Redirect with Return URL', () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with invalid session state
  const createTestWrapperWithInvalidSession = (
    sessionState: any, 
    currentRoute: string, 
    returnUrlScenario: any
  ) => {
    // Mock pathname
    vi.mocked(usePathname).mockReturnValue(currentRoute)

    // Mock search params based on scenario
    const fullReturnUrl = returnUrlScenario.hasReturnUrl 
      ? returnUrlScenario.returnUrlPath + returnUrlScenario.searchParams
      : null

    const searchParamsMap = new Map()
    if (returnUrlScenario.hasReturnUrl && returnUrlScenario.isValidUrl) {
      searchParamsMap.set('returnUrl', encodeURIComponent(fullReturnUrl))
    } else if (returnUrlScenario.hasReturnUrl && !returnUrlScenario.isValidUrl) {
      // Invalid return URL scenarios
      searchParamsMap.set('returnUrl', 'javascript:alert(1)') // XSS attempt
    }

    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => searchParamsMap.get(key) || null),
      toString: vi.fn(() => {
        const params = new URLSearchParams()
        searchParamsMap.forEach((value, key) => params.set(key, value))
        return params.toString()
      }),
    } as any)

    // Mock invalid session state
    const mockUser = sessionState.hasUser && sessionState.isValid ? {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
    } : null

    const mockSession = sessionState.hasUser && !sessionState.isExpired ? {
      user: mockUser,
      access_token: 'test-token',
      expires_at: sessionState.isExpired 
        ? Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        : Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    } : null

    // Mock session manager to return invalid state
    vi.mocked(sessionManager.validateSession).mockResolvedValue(sessionState.isValid)
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: mockUser,
      session: mockSession,
      lastValidated: sessionState.lastValidated,
      isValid: sessionState.isValid,
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

  it('invalid sessions should redirect to login with preserved return URL', () => {
    fc.assert(
      fc.property(
        sessionStateArb, 
        protectedRouteArb, 
        returnUrlScenarioArb, 
        invalidationReasonArb,
        async (sessionState, currentRoute, returnUrlScenario, reason) => {
          // Only test invalid session scenarios
          if (sessionState.isValid) {
            return true // Skip valid sessions
          }

          const TestWrapper = createTestWrapperWithInvalidSession(
            sessionState, 
            currentRoute, 
            returnUrlScenario
          )

          render(
            <TestWrapper>
              <SmartRouteGuard requireAuth={true}>
                <div data-testid="protected-content">Protected Content</div>
              </SmartRouteGuard>
            </TestWrapper>
          )

          await waitFor(() => {
            // Property: Invalid sessions should not show protected content
            const protectedContent = screen.queryByTestId('protected-content')
            expect(protectedContent).not.toBeInTheDocument()

            // Property: Should redirect to login
            expect(mockPush).toHaveBeenCalled()
            
            if (mockPush.mock.calls.length > 0) {
              const redirectCall = mockPush.mock.calls[0][0]
              
              // Property: Redirect should be to login page
              expect(redirectCall).toContain('/auth/login')
              
              // Property: Return URL should be preserved if valid
              if (returnUrlScenario.hasReturnUrl && returnUrlScenario.isValidUrl) {
                expect(redirectCall).toContain('returnUrl=')
                expect(redirectCall).toContain(encodeURIComponent(currentRoute))
              }
              
              // Property: Invalid return URLs should be filtered out
              if (returnUrlScenario.hasReturnUrl && !returnUrlScenario.isValidUrl) {
                // Should not contain the invalid URL
                expect(redirectCall).not.toContain('javascript:')
                expect(redirectCall).not.toContain('alert')
              }
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('expired sessions should redirect with session expiry reason', () => {
    fc.assert(
      fc.property(
        protectedRouteArb,
        returnUrlScenarioArb,
        async (currentRoute, returnUrlScenario) => {
          const expiredSessionState = {
            isValid: false,
            isExpired: true,
            hasUser: true,
            sessionAge: 86400000, // 24 hours old
            lastValidated: new Date(Date.now() - 86400000), // 24 hours ago
          }

          const TestWrapper = createTestWrapperWithInvalidSession(
            expiredSessionState, 
            currentRoute, 
            returnUrlScenario
          )

          render(
            <TestWrapper>
              <SmartRouteGuard requireAuth={true}>
                <div data-testid="protected-content">Protected Content</div>
              </SmartRouteGuard>
            </TestWrapper>
          )

          await waitFor(() => {
            // Property: Expired sessions should redirect to login
            expect(mockPush).toHaveBeenCalled()
            
            if (mockPush.mock.calls.length > 0) {
              const redirectCall = mockPush.mock.calls[0][0]
              
              // Property: Should include reason for expired session
              expect(redirectCall).toContain('/auth/login')
              expect(redirectCall).toContain('reason=')
              
              // Property: Return URL should be preserved
              expect(redirectCall).toContain('returnUrl=')
              expect(redirectCall).toContain(encodeURIComponent(currentRoute))
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('return URL validation should prevent security vulnerabilities', () => {
    fc.assert(
      fc.property(
        protectedRouteArb,
        fc.constantFrom(
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'http://evil.com/steal-data',
          'https://malicious.site/phish',
          '/auth/login?redirect=javascript:alert(1)',
          '//evil.com/redirect',
          '../../../etc/passwd',
          '/auth/../admin',
          'vbscript:msgbox(1)'
        ),
        async (currentRoute, maliciousUrl) => {
          const invalidSessionState = {
            isValid: false,
            isExpired: true,
            hasUser: false,
            sessionAge: 0,
            lastValidated: new Date(),
          }

          // Mock pathname
          vi.mocked(usePathname).mockReturnValue(currentRoute)

          // Mock search params with malicious return URL
          vi.mocked(useSearchParams).mockReturnValue({
            get: vi.fn((key: string) => key === 'returnUrl' ? maliciousUrl : null),
            toString: vi.fn(() => `returnUrl=${encodeURIComponent(maliciousUrl)}`),
          } as any)

          // Mock session manager to return invalid state
          vi.mocked(sessionManager.validateSession).mockResolvedValue(false)
          vi.mocked(sessionManager.getState).mockReturnValue({
            user: null,
            session: null,
            lastValidated: invalidSessionState.lastValidated,
            isValid: false,
          })

          const TestWrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>
              <WorkspaceProvider>
                {children}
              </WorkspaceProvider>
            </AuthProvider>
          )

          render(
            <TestWrapper>
              <SmartRouteGuard requireAuth={true}>
                <div data-testid="protected-content">Protected Content</div>
              </SmartRouteGuard>
            </TestWrapper>
          )

          await waitFor(() => {
            // Property: Should still redirect to login
            expect(mockPush).toHaveBeenCalled()
            
            if (mockPush.mock.calls.length > 0) {
              const redirectCall = mockPush.mock.calls[0][0]
              
              // Property: Should not include malicious URLs
              expect(redirectCall).not.toContain('javascript:')
              expect(redirectCall).not.toContain('data:')
              expect(redirectCall).not.toContain('vbscript:')
              expect(redirectCall).not.toContain('evil.com')
              expect(redirectCall).not.toContain('malicious.site')
              expect(redirectCall).not.toContain('../')
              expect(redirectCall).not.toContain('//')
              
              // Property: Should use safe fallback (current route)
              expect(redirectCall).toContain('/auth/login')
              expect(redirectCall).toContain('returnUrl=')
              expect(redirectCall).toContain(encodeURIComponent(currentRoute))
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('return URL utility functions should maintain security invariants', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (inputUrl) => {
          // Property: isValidReturnUrl should reject dangerous URLs
          const isValid = isValidReturnUrl(inputUrl)
          
          if (isValid) {
            // If URL is considered valid, it should be safe
            expect(inputUrl).not.toContain('javascript:')
            expect(inputUrl).not.toContain('data:')
            expect(inputUrl).not.toContain('vbscript:')
            expect(inputUrl).not.toMatch(/^https?:\/\//)
            expect(inputUrl).not.toContain('../')
            expect(inputUrl).not.toContain('//')
            expect(inputUrl).toMatch(/^\//)
          }
          
          // Property: extractReturnUrl should handle invalid URLs gracefully
          const searchParams = new URLSearchParams()
          searchParams.set('returnUrl', inputUrl)
          
          const extracted = extractReturnUrl(searchParams)
          
          if (extracted !== null) {
            // If URL was extracted, it should be valid
            expect(isValidReturnUrl(extracted)).toBe(true)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('login URL creation should preserve valid return URLs and filter invalid ones', () => {
    fc.assert(
      fc.property(
        protectedRouteArb,
        fc.option(fc.string(), { nil: undefined }),
        fc.constantFrom('expired', 'required', 'invalid', undefined),
        (currentPath, searchParams, reason) => {
          // Property: createLoginUrlWithReturn should always return a valid login URL
          const loginUrl = createLoginUrlWithReturn(currentPath, searchParams, reason)
          
          expect(loginUrl).toContain('/auth/login')
          
          // Parse the URL to check parameters
          const url = new URL(loginUrl)
          
          // Property: Should always include return URL for valid paths
          if (isValidReturnUrl(currentPath)) {
            expect(url.searchParams.has('returnUrl')).toBe(true)
            const returnUrl = url.searchParams.get('returnUrl')
            expect(returnUrl).toBe(encodeURIComponent(currentPath + (searchParams || '')))
          }
          
          // Property: Should include reason if provided
          if (reason) {
            expect(url.searchParams.get('reason')).toBe(reason)
          }
          
          // Property: URL should be well-formed
          expect(() => new URL(loginUrl)).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('session invalidation should consistently preserve intended destination', () => {
    fc.assert(
      fc.property(
        sessionStateArb,
        protectedRouteArb,
        fc.option(fc.string(), { nil: undefined }),
        async (sessionState, currentRoute, searchParams) => {
          // Only test invalid sessions
          if (sessionState.isValid) {
            return true
          }

          const TestWrapper = createTestWrapperWithInvalidSession(
            sessionState,
            currentRoute,
            { hasReturnUrl: false, returnUrlPath: '', hasSearchParams: false, searchParams: '', isValidUrl: true }
          )

          render(
            <TestWrapper>
              <SmartRouteGuard requireAuth={true}>
                <div data-testid="protected-content">Protected Content</div>
              </SmartRouteGuard>
            </TestWrapper>
          )

          await waitFor(() => {
            // Property: Invalid sessions should always redirect
            expect(mockPush).toHaveBeenCalled()
            
            if (mockPush.mock.calls.length > 0) {
              const redirectCall = mockPush.mock.calls[0][0]
              
              // Property: Redirect should preserve the current route as return URL
              expect(redirectCall).toContain('/auth/login')
              expect(redirectCall).toContain('returnUrl=')
              
              // Extract and validate the return URL
              const url = new URL(redirectCall, 'http://localhost')
              const returnUrl = url.searchParams.get('returnUrl')
              
              if (returnUrl) {
                const decodedReturnUrl = decodeURIComponent(returnUrl)
                expect(decodedReturnUrl).toContain(currentRoute)
              }
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})