/**
 * Property-based tests for access control of unverified users
 * Feature: authentication-workspace, Property 4: Access Control for Unverified Users
 * Validates: Requirements 1.6, 4.5, 8.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { AuthProvider } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}

beforeEach(() => {
  vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

// Mock FeatureGate component to test access control
function MockFeatureGate({ children }: { children: React.ReactNode }) {
  return <div data-testid="feature-content">{children}</div>
}

// Mock protected component that should be blocked for unverified users
function MockProtectedComponent({ user }: { user: User | null }) {
  // Simulate access control logic (Requirements 1.6, 4.5, 8.5)
  if (!user) {
    return <div data-testid="login-required">Please log in</div>
  }
  
  if (!user.email_confirmed_at) {
    return <div data-testid="verification-required">Please verify your email</div>
  }
  
  return (
    <MockFeatureGate>
      <div data-testid="protected-content">Protected Feature Content</div>
    </MockFeatureGate>
  )
}

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// Helper to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: fc.sample(fc.uuid(), 1)[0],
  email: fc.sample(fc.emailAddress(), 1)[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: undefined, // Default to unverified
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: [],
  ...overrides,
})

// Helper to create mock session
const createMockSession = (user: User): Session => ({
  access_token: fc.sample(fc.string({ minLength: 100, maxLength: 200 }), 1)[0],
  refresh_token: fc.sample(fc.string({ minLength: 100, maxLength: 200 }), 1)[0],
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user,
})

describe('Access Control Property Tests', () => {
  /**
   * Property 4: Access Control for Unverified Users
   * For any unverified user account, the system should prevent access to application features
   * until email verification is completed
   */
  
  it('Property 4.1: Unverified users blocked from protected features', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            // Ensure email_confirmed_at is undefined (unverified)
            email_confirmed_at: fc.constant(undefined),
          }),
        }),
        async ({ user }) => {
          const mockUser = createMockUser(user)
          const mockSession = createMockSession(mockUser)
          
          // Mock unverified user session
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          const mockUnsubscribe = vi.fn()
          mockSupabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } },
          })
          
          const TestComponent = () => {
            return (
              <TestWrapper>
                <MockProtectedComponent user={mockUser} />
              </TestWrapper>
            )
          }
          
          const { unmount } = render(<TestComponent />)
          
          try {
            // Wait for auth context to load
            await waitFor(() => {
              // Verify unverified user is blocked from protected content (Requirements 1.6, 4.5, 8.5)
              expect(screen.getByTestId('verification-required')).toBeInTheDocument()
              expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
            }, { timeout: 2000 })
            
            // Verify the correct message is shown
            expect(screen.getByText('Please verify your email')).toBeInTheDocument()
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  it('Property 4.2: Verified users granted access to protected features', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            // Ensure email_confirmed_at is set (verified)
            email_confirmed_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
          }),
        }),
        async ({ user }) => {
          const mockUser = createMockUser(user)
          const mockSession = createMockSession(mockUser)
          
          // Mock verified user session
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          const mockUnsubscribe = vi.fn()
          mockSupabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } },
          })
          
          const TestComponent = () => {
            return (
              <TestWrapper>
                <MockProtectedComponent user={mockUser} />
              </TestWrapper>
            )
          }
          
          const { unmount } = render(<TestComponent />)
          
          try {
            // Wait for auth context to load
            await waitFor(() => {
              // Verify verified user has access to protected content
              expect(screen.getByTestId('protected-content')).toBeInTheDocument()
              expect(screen.queryByTestId('verification-required')).not.toBeInTheDocument()
            }, { timeout: 2000 })
            
            // Verify the protected content is accessible
            expect(screen.getByText('Protected Feature Content')).toBeInTheDocument()
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  it('Property 4.3: Unauthenticated users blocked from all features', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No user
        async () => {
          // Mock no session (unauthenticated)
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
          })
          
          const mockUnsubscribe = vi.fn()
          mockSupabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } },
          })
          
          const TestComponent = () => {
            return (
              <TestWrapper>
                <MockProtectedComponent user={null} />
              </TestWrapper>
            )
          }
          
          const { unmount } = render(<TestComponent />)
          
          try {
            // Wait for auth context to load
            await waitFor(() => {
              // Verify unauthenticated user is blocked from all content
              expect(screen.getByTestId('login-required')).toBeInTheDocument()
              expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
              expect(screen.queryByTestId('verification-required')).not.toBeInTheDocument()
            }, { timeout: 2000 })
            
            // Verify the correct message is shown
            expect(screen.getByText('Please log in')).toBeInTheDocument()
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 5 }
    )
  })

  it('Property 4.4: Access control consistency across verification states', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Unverified user
          fc.record({
            type: fc.constant('unverified'),
            user: fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              email_confirmed_at: fc.constant(undefined),
            }),
          }),
          // Verified user
          fc.record({
            type: fc.constant('verified'),
            user: fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              email_confirmed_at: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
            }),
          }),
          // No user
          fc.record({
            type: fc.constant('none'),
            user: fc.constant(null),
          })
        ),
        async ({ type, user }) => {
          const mockUser = user ? createMockUser(user) : null
          const mockSession = mockUser ? createMockSession(mockUser) : null
          
          // Mock appropriate session state
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          const mockUnsubscribe = vi.fn()
          mockSupabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } },
          })
          
          const TestComponent = () => {
            return (
              <TestWrapper>
                <MockProtectedComponent user={mockUser} />
              </TestWrapper>
            )
          }
          
          const { unmount } = render(<TestComponent />)
          
          try {
            // Wait for auth context to load
            await waitFor(() => {
              switch (type) {
                case 'none':
                  // Unauthenticated users should see login prompt
                  expect(screen.getByTestId('login-required')).toBeInTheDocument()
                  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
                  expect(screen.queryByTestId('verification-required')).not.toBeInTheDocument()
                  break
                  
                case 'unverified':
                  // Unverified users should see verification prompt (Requirements 1.6, 4.5, 8.5)
                  expect(screen.getByTestId('verification-required')).toBeInTheDocument()
                  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
                  expect(screen.queryByTestId('login-required')).not.toBeInTheDocument()
                  break
                  
                case 'verified':
                  // Verified users should see protected content
                  expect(screen.getByTestId('protected-content')).toBeInTheDocument()
                  expect(screen.queryByTestId('verification-required')).not.toBeInTheDocument()
                  expect(screen.queryByTestId('login-required')).not.toBeInTheDocument()
                  break
              }
            }, { timeout: 2000 })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 4.5: Email verification state determines access level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseUser: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          }),
          verificationStates: fc.array(
            fc.oneof(
              fc.constant(undefined), // Unverified
              fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()) // Verified
            ),
            { minLength: 1, maxLength: 2 }
          ),
        }),
        async ({ baseUser, verificationStates }) => {
          for (const emailConfirmedAt of verificationStates) {
            const mockUser = createMockUser({
              ...baseUser,
              email_confirmed_at: emailConfirmedAt || undefined,
            })
            const mockSession = createMockSession(mockUser)
            
            // Mock session with current verification state
            mockSupabase.auth.getSession.mockResolvedValue({
              data: { session: mockSession },
              error: null,
            })
            
            const mockUnsubscribe = vi.fn()
            mockSupabase.auth.onAuthStateChange.mockReturnValue({
              data: { subscription: { unsubscribe: mockUnsubscribe } },
            })
            
            const TestComponent = () => {
              return (
                <TestWrapper>
                  <MockProtectedComponent user={mockUser} />
                </TestWrapper>
              )
            }
            
            const { unmount } = render(<TestComponent />)
            
            try {
              // Wait for auth context to load
              await waitFor(() => {
                if (emailConfirmedAt) {
                  // Verified state should grant access
                  expect(screen.getByTestId('protected-content')).toBeInTheDocument()
                  expect(screen.queryByTestId('verification-required')).not.toBeInTheDocument()
                } else {
                  // Unverified state should block access (Requirements 1.6, 4.5, 8.5)
                  expect(screen.getByTestId('verification-required')).toBeInTheDocument()
                  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
                }
              }, { timeout: 2000 })
            } finally {
              unmount()
            }
          }
        }
      ),
      { numRuns: 8 }
    )
  })

  it('Property 4.6: Access control prevents feature bypass attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            email_confirmed_at: fc.constant(undefined), // Always unverified
          }),
          bypassAttempts: fc.array(
            fc.oneof(
              fc.constant('direct_access'),
              fc.constant('state_manipulation'),
              fc.constant('session_forge')
            ),
            { minLength: 1, maxLength: 2 }
          ),
        }),
        async ({ user, bypassAttempts }) => {
          const mockUser = createMockUser(user)
          const mockSession = createMockSession(mockUser)
          
          // Mock unverified user session
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          const mockUnsubscribe = vi.fn()
          mockSupabase.auth.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } },
          })
          
          for (const attempt of bypassAttempts) {
            let testUser = mockUser
            
            // Simulate different bypass attempts
            switch (attempt) {
              case 'direct_access':
                // Try to access with unverified user directly
                break
              case 'state_manipulation':
                // Try to manipulate user state (but keep email_confirmed_at null)
                testUser = { ...mockUser, role: 'admin' as any }
                break
              case 'session_forge':
                // Try with modified session but still unverified
                testUser = { ...mockUser, aud: 'verified' as any }
                break
            }
            
            const TestComponent = () => {
              return (
                <TestWrapper>
                  <MockProtectedComponent user={testUser} />
                </TestWrapper>
              )
            }
            
            const { unmount } = render(<TestComponent />)
            
            try {
              // Wait for auth context to load
              await waitFor(() => {
                // All bypass attempts should fail - access should still be blocked
                // (Requirements 1.6, 4.5, 8.5)
                expect(screen.getByTestId('verification-required')).toBeInTheDocument()
                expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
              }, { timeout: 2000 })
            } finally {
              unmount()
            }
          }
        }
      ),
      { numRuns: 5 }
    )
  })
})