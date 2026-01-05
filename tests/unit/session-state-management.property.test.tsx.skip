/**
 * Property-Based Test: Session State Management
 * 
 * **Property 12: Session State Management**
 * **Validates: Requirements 3.4, 6.2**
 * 
 * This property test verifies that authentication state changes update the context
 * without changing routes, ensuring session management is transparent to navigation.
 * 
 * **Feature: auth-page-refresh-fix, Property 12: Session State Management**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, cleanup, act, waitFor } from '@testing-library/react'
import fc from 'fast-check'
import React from 'react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  })),
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock contexts
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: vi.fn(() => ({
    currentWorkspace: null,
    members: [],
    loading: false,
    invitations: [],
    workspaces: [],
    createWorkspace: vi.fn(),
    switchWorkspace: vi.fn(),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
  })),
  WorkspaceProvider: ({ children }: any) => children,
}))

const mockUsePathname = vi.mocked((await import('next/navigation')).usePathname)

describe('Property Test: Session State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default to a non-auth route
    mockUsePathname.mockReturnValue('/dashboard')
    
    // Default session state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // Generator for different session states
  const sessionStateGenerator = fc.record({
    user: fc.option(fc.record({
      id: fc.string(),
      email: fc.emailAddress(),
      email_confirmed_at: fc.option(fc.date().map(d => d.toISOString())),
    }), { nil: null }),
    session: fc.option(fc.record({
      access_token: fc.string(),
      refresh_token: fc.string(),
      expires_at: fc.integer({ min: Date.now(), max: Date.now() + 3600000 }),
      user: fc.record({
        id: fc.string(),
        email: fc.emailAddress(),
      }),
    }), { nil: null }),
  })

  // Generator for different routes
  const routeGenerator = fc.oneof(
    fc.constant('/dashboard'),
    fc.constant('/transactions'),
    fc.constant('/settings'),
    fc.constant('/reports'),
    fc.constant('/categories'),
    fc.constant('/auth/login'),
    fc.constant('/auth/signup'),
    fc.constant('/onboarding/workspace'),
  )

  // Component to track auth state changes and navigation calls
  const AuthStateTracker = () => {
    const auth = useAuth()
    const [stateChanges, setStateChanges] = React.useState<any[]>([])

    React.useEffect(() => {
      setStateChanges(prev => [...prev, {
        timestamp: Date.now(),
        user: auth.user,
        isAuthenticated: auth.isAuthenticated,
        loading: auth.loading,
      }])
    }, [auth.user, auth.isAuthenticated, auth.loading])

    return (
      <div data-testid="auth-state-tracker">
        <div data-testid="current-user">{auth.user?.email || 'null'}</div>
        <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
        <div data-testid="is-loading">{auth.loading.toString()}</div>
        <div data-testid="state-changes-count">{stateChanges.length}</div>
      </div>
    )
  }

  /**
   * Property 12.1: Authentication state changes should not trigger route changes
   * For any authentication state change, the current route should remain unchanged
   */
  it('should not trigger route changes when authentication state changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        routeGenerator,
        sessionStateGenerator,
        sessionStateGenerator,
        async (currentRoute, initialState, newState) => {
          // Setup initial route
          mockUsePathname.mockReturnValue(currentRoute)
          
          // Setup initial session state
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: initialState.session },
            error: null,
          })

          // Clear navigation mocks
          mockPush.mockClear()
          mockReplace.mockClear()

          // Render component with auth context
          const { getByTestId } = render(
            <AuthProvider>
              <WorkspaceProvider>
                <AuthStateTracker />
              </WorkspaceProvider>
            </AuthProvider>
          )

          // Wait for initial state to settle
          await waitFor(() => {
            expect(getByTestId('is-loading')).toHaveTextContent('false')
          })

          // Record initial navigation call count
          const initialPushCalls = mockPush.mock.calls.length
          const initialReplaceCalls = mockReplace.mock.calls.length

          // Change session state
          await act(async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
              data: { session: newState.session },
              error: null,
            })

            // Trigger auth state change (simulate what would happen in real auth context)
            const authStateChangeCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0]?.[0]
            if (authStateChangeCallback) {
              authStateChangeCallback('SIGNED_IN', newState.session)
            }
          })

          // Wait for state to update
          await waitFor(() => {
            const stateChangesCount = parseInt(getByTestId('state-changes-count').textContent || '0')
            expect(stateChangesCount).toBeGreaterThan(1)
          })

          // Verify no navigation calls were made due to state change
          expect(mockPush.mock.calls.length).toBe(initialPushCalls)
          expect(mockReplace.mock.calls.length).toBe(initialReplaceCalls)

          // Verify state was actually updated
          const isAuthenticated = getByTestId('is-authenticated').textContent === 'true'
          const expectedAuthenticated = !!newState.session

          expect(isAuthenticated).toBe(expectedAuthenticated)
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * Property 12.2: Context should provide state without navigation side effects
   * For any context access, only state should be provided without triggering redirects
   */
  it('should provide state without navigation side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        routeGenerator,
        sessionStateGenerator,
        async (currentRoute, sessionState) => {
          mockUsePathname.mockReturnValue(currentRoute)
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: sessionState.session },
            error: null,
          })

          // Clear navigation mocks
          mockPush.mockClear()
          mockReplace.mockClear()

          // Component that accesses auth context multiple times
          const MultipleContextAccess = () => {
            const auth1 = useAuth()
            const auth2 = useAuth()
            const auth3 = useAuth()

            return (
              <div data-testid="multiple-access">
                <div data-testid="access-1">{auth1.isAuthenticated.toString()}</div>
                <div data-testid="access-2">{auth2.isAuthenticated.toString()}</div>
                <div data-testid="access-3">{auth3.isAuthenticated.toString()}</div>
              </div>
            )
          }

          render(
            <AuthProvider>
              <WorkspaceProvider>
                <MultipleContextAccess />
              </WorkspaceProvider>
            </AuthProvider>
          )

          // Wait for context to initialize
          await waitFor(() => {
            expect(mockSupabase.auth.getSession).toHaveBeenCalled()
          })

          // Verify no navigation calls were made from context access
          expect(mockPush).not.toHaveBeenCalled()
          expect(mockReplace).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 25 }
    )
  })

  /**
   * Property 12.3: Session validation should be transparent to navigation
   * For any session validation, the current page location should not change
   */
  it('should perform session validation without changing page location', async () => {
    await fc.assert(
      fc.asyncProperty(
        routeGenerator,
        fc.boolean(),
        async (currentRoute, isValidSession) => {
          mockUsePathname.mockReturnValue(currentRoute)
          
          // Setup session based on validity
          const sessionData = isValidSession ? {
            access_token: 'valid-token',
            refresh_token: 'refresh-token',
            expires_at: Date.now() + 3600000,
            user: { id: 'user-id', email: 'test@example.com' },
          } : null

          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: sessionData },
            error: null,
          })

          // Clear navigation mocks
          mockPush.mockClear()
          mockReplace.mockClear()

          // Component that validates session
          const SessionValidator = () => {
            const { validateSession } = useAuth()
            const [validationResult, setValidationResult] = React.useState<boolean | null>(null)

            React.useEffect(() => {
              const validate = async () => {
                const result = await validateSession()
                setValidationResult(result)
              }
              validate()
            }, [validateSession])

            return (
              <div data-testid="session-validator">
                <div data-testid="validation-result">
                  {validationResult === null ? 'pending' : validationResult.toString()}
                </div>
              </div>
            )
          }

          const { getByTestId } = render(
            <AuthProvider>
              <WorkspaceProvider>
                <SessionValidator />
              </WorkspaceProvider>
            </AuthProvider>
          )

          // Wait for validation to complete
          await waitFor(() => {
            const result = getByTestId('validation-result').textContent
            expect(result).not.toBe('pending')
          })

          // Verify session validation didn't trigger navigation
          expect(mockPush).not.toHaveBeenCalled()
          expect(mockReplace).not.toHaveBeenCalled()

          // Verify validation result matches expected session validity
          const validationResult = getByTestId('validation-result').textContent === 'true'
          expect(validationResult).toBe(isValidSession)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 12.4: Authentication actions should update state without automatic redirects
   * For any authentication action, state should update without triggering automatic navigation
   */
  it('should update state from authentication actions without automatic redirects', async () => {
    await fc.assert(
      fc.asyncProperty(
        routeGenerator,
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8 }),
        }),
        async (currentRoute, credentials) => {
          mockUsePathname.mockReturnValue(currentRoute)
          
          // Mock successful sign in
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: {
              user: { id: 'user-id', email: credentials.email },
              session: {
                access_token: 'token',
                refresh_token: 'refresh',
                expires_at: Date.now() + 3600000,
                user: { id: 'user-id', email: credentials.email },
              },
            },
            error: null,
          })

          // Clear navigation mocks
          mockPush.mockClear()
          mockReplace.mockClear()

          // Component that performs authentication action
          const AuthActionComponent = () => {
            const { signIn } = useAuth()
            const [actionResult, setActionResult] = React.useState<any>(null)

            React.useEffect(() => {
              const performSignIn = async () => {
                const result = await signIn(credentials.email, credentials.password)
                setActionResult(result)
              }
              performSignIn()
            }, [signIn])

            return (
              <div data-testid="auth-action">
                <div data-testid="action-completed">
                  {actionResult ? 'completed' : 'pending'}
                </div>
              </div>
            )
          }

          const { getByTestId } = render(
            <AuthProvider>
              <WorkspaceProvider>
                <AuthActionComponent />
              </WorkspaceProvider>
            </AuthProvider>
          )

          // Wait for action to complete
          await waitFor(() => {
            expect(getByTestId('action-completed')).toHaveTextContent('completed')
          })

          // Verify authentication action didn't trigger automatic navigation
          // Note: Navigation should only happen from auth pages, not from context actions
          expect(mockPush).not.toHaveBeenCalled()
          expect(mockReplace).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 15 }
    )
  })

  /**
   * Property 12.5: State updates should be consistent across multiple context consumers
   * For any state change, all context consumers should receive the same updated state
   */
  it('should provide consistent state across multiple context consumers', async () => {
    await fc.assert(
      fc.asyncProperty(
        sessionStateGenerator,
        sessionStateGenerator,
        async (initialState, updatedState) => {
          // Setup initial state
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: initialState.session },
            error: null,
          })

          // Multiple components consuming auth context
          const Consumer1 = () => {
            const { isAuthenticated, user } = useAuth()
            return (
              <div data-testid="consumer-1">
                <div data-testid="consumer-1-auth">{isAuthenticated.toString()}</div>
                <div data-testid="consumer-1-user">{user?.email || 'null'}</div>
              </div>
            )
          }

          const Consumer2 = () => {
            const { isAuthenticated, user } = useAuth()
            return (
              <div data-testid="consumer-2">
                <div data-testid="consumer-2-auth">{isAuthenticated.toString()}</div>
                <div data-testid="consumer-2-user">{user?.email || 'null'}</div>
              </div>
            )
          }

          const Consumer3 = () => {
            const { isAuthenticated, user } = useAuth()
            return (
              <div data-testid="consumer-3">
                <div data-testid="consumer-3-auth">{isAuthenticated.toString()}</div>
                <div data-testid="consumer-3-user">{user?.email || 'null'}</div>
              </div>
            )
          }

          const { getByTestId } = render(
            <AuthProvider>
              <WorkspaceProvider>
                <Consumer1 />
                <Consumer2 />
                <Consumer3 />
              </WorkspaceProvider>
            </AuthProvider>
          )

          // Wait for initial state
          await waitFor(() => {
            expect(mockSupabase.auth.getSession).toHaveBeenCalled()
          })

          // Update state
          await act(async () => {
            mockSupabase.auth.getSession.mockResolvedValue({
              data: { session: updatedState.session },
              error: null,
            })

            // Trigger state change
            const authStateChangeCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0]?.[0]
            if (authStateChangeCallback) {
              authStateChangeCallback('SIGNED_IN', updatedState.session)
            }
          })

          // Wait for state to propagate
          await waitFor(() => {
            const consumer1Auth = getByTestId('consumer-1-auth').textContent
            const consumer2Auth = getByTestId('consumer-2-auth').textContent
            const consumer3Auth = getByTestId('consumer-3-auth').textContent

            // All consumers should have the same auth state
            expect(consumer1Auth).toBe(consumer2Auth)
            expect(consumer2Auth).toBe(consumer3Auth)

            const consumer1User = getByTestId('consumer-1-user').textContent
            const consumer2User = getByTestId('consumer-2-user').textContent
            const consumer3User = getByTestId('consumer-3-user').textContent

            // All consumers should have the same user state
            expect(consumer1User).toBe(consumer2User)
            expect(consumer2User).toBe(consumer3User)
          })

          // Verify state consistency matches expected values
          const expectedAuth = !!updatedState.session
          const expectedUser = updatedState.session?.user?.email || 'null'

          expect(getByTestId('consumer-1-auth')).toHaveTextContent(expectedAuth.toString())
          expect(getByTestId('consumer-1-user')).toHaveTextContent(expectedUser)
        }
      ),
      { numRuns: 20 }
    )
  })
})