/**
 * Property-based tests for authentication security
 * Feature: authentication-workspace, Property 7: Authentication Security Consistency
 * Validates: Requirements 2.3, 2.6, 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import fc from 'fast-check'
import { AuthProvider, useAuth } from '../auth-context'
import { createClient } from '@/lib/supabase/client'
import type { AuthError } from '@supabase/supabase-js'

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
  
  // Default mocks
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })
  
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('Authentication Security Property Tests', () => {
  /**
   * Property 7: Authentication Security Consistency
   * For any failed authentication attempt, the system should return generic error messages 
   * without revealing whether accounts exist, and implement rate limiting after repeated failures
   */
  
  it('Property 7.1: Generic error messages for failed login attempts (Requirement 2.3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 50 }),
          errorType: fc.oneof(
            fc.constant('invalid_credentials'),
            fc.constant('email_not_confirmed'),
            fc.constant('too_many_requests'),
            fc.constant('user_not_found'),
            fc.constant('invalid_password')
          ),
        }),
        async ({ email, password, errorType }) => {
          // Mock different types of authentication errors
          const mockError = {
            name: 'AuthError',
            message: getErrorMessage(errorType),
            status: getErrorStatus(errorType),
            code: errorType,
            __isAuthError: true
          } as any
          
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          
          const { result } = renderHook(() => useAuth(), {
            wrapper: TestWrapper,
          })
          
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })
          
          // Attempt sign in
          const authResult = await result.current.signIn({ email, password, rememberMe: false })
          
          // Verify generic error message is returned regardless of specific error type
          expect(authResult.error).toBe('Invalid email or password')
          expect(authResult.error).not.toContain('user_not_found')
          expect(authResult.error).not.toContain('email_not_confirmed')
          expect(authResult.error).not.toContain('account does not exist')
          expect(authResult.error).not.toContain('user does not exist')
          
          // Verify the error doesn't reveal whether the account exists
          expect(authResult.error).not.toMatch(/account|user|email.*exist/i)
          expect(authResult.error).not.toMatch(/not found|unknown/i)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 7.2: Consistent password reset messages regardless of email existence (Requirement 3.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          emailExists: fc.boolean(),
        }),
        async ({ email, emailExists }) => {
          // Mock password reset response based on whether email exists
          if (emailExists) {
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
              data: {},
              error: null,
            })
          } else {
            // Even for non-existent emails, Supabase typically doesn't return an error
            // to prevent email enumeration attacks
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
              data: {},
              error: null,
            })
          }
          
          const { result } = renderHook(() => useAuth(), {
            wrapper: TestWrapper,
          })
          
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })
          
          // Request password reset
          const resetResult = await result.current.resetPassword(email)
          
          // Verify the same success message is returned regardless of email existence
          expect(resetResult.data?.message).toBe(
            'If an account with that email exists, you will receive a password reset link.'
          )
          
          // Verify the message doesn't reveal whether the email exists
          expect(resetResult.data?.message).toContain('If an account')
          expect(resetResult.data?.message).not.toContain('sent')
          expect(resetResult.data?.message).not.toContain('will send')
          expect(resetResult.data?.message).not.toContain('does not exist')
          expect(resetResult.data?.message).not.toContain('not found')
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 7.3: Error message consistency across different authentication failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 1, maxLength: 50 }),
            errorType: fc.oneof(
              fc.constant('invalid_credentials'),
              fc.constant('email_not_confirmed'),
              fc.constant('user_not_found'),
              fc.constant('invalid_password'),
              fc.constant('account_locked')
            ),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (loginAttempts) => {
          const { result } = renderHook(() => useAuth(), {
            wrapper: TestWrapper,
          })
          
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })
          
          const errorMessages: string[] = []
          
          // Perform multiple login attempts with different error types
          for (const attempt of loginAttempts) {
            const mockError = {
              name: 'AuthError',
              message: getErrorMessage(attempt.errorType),
              status: getErrorStatus(attempt.errorType),
              code: attempt.errorType,
              __isAuthError: true
            } as any
            
            mockSupabase.auth.signInWithPassword.mockResolvedValue({
              data: { user: null, session: null },
              error: mockError,
            })
            
            const authResult = await result.current.signIn({
              email: attempt.email,
              password: attempt.password,
              rememberMe: false
            })
            
            if (authResult.error) {
              errorMessages.push(authResult.error)
            }
          }
          
          // Verify all error messages are the same generic message
          const uniqueMessages = Array.from(new Set(errorMessages))
          expect(uniqueMessages).toHaveLength(1)
          expect(uniqueMessages[0]).toBe('Invalid email or password')
          
          // Verify no error message reveals specific failure reasons
          errorMessages.forEach(message => {
            expect(message).not.toMatch(/not found|does not exist|unconfirmed|locked|suspended/i)
            expect(message).not.toContain('user_not_found')
            expect(message).not.toContain('email_not_confirmed')
            expect(message).not.toContain('account_locked')
          })
        }
      ),
      { numRuns: 10 }
    )
  })

  it('Property 7.4: Password reset error handling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          shouldError: fc.boolean(),
          errorType: fc.oneof(
            fc.constant('network_error'),
            fc.constant('rate_limit'),
            fc.constant('service_unavailable')
          ),
        }),
        async ({ email, shouldError, errorType }) => {
          if (shouldError) {
            const mockError = {
              name: 'AuthError',
              message: getResetErrorMessage(errorType),
              status: getResetErrorStatus(errorType),
              code: errorType,
              __isAuthError: true
            } as any
            
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
              data: null,
              error: mockError,
            })
          } else {
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
              data: {},
              error: null,
            })
          }
          
          const { result } = renderHook(() => useAuth(), {
            wrapper: TestWrapper,
          })
          
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })
          
          const resetResult = await result.current.resetPassword(email)
          
          if (shouldError) {
            // Even with errors, should return the same generic success message
            // to prevent information disclosure
            expect(resetResult.data?.message).toBe(
              'If an account with that email exists, you will receive a password reset link.'
            )
          } else {
            // Success case should also return the same message
            expect(resetResult.data?.message).toBe(
              'If an account with that email exists, you will receive a password reset link.'
            )
          }
          
          // Verify no error details are exposed to the user
          expect(resetResult.data?.message).not.toMatch(/error|failed|unavailable/i)
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 7.5: Authentication error handling prevents information leakage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          validEmail: fc.emailAddress(),
          invalidEmail: fc.string().filter(s => !s.includes('@') || s.length < 5),
          password: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ validEmail, invalidEmail, password }) => {
          const { result } = renderHook(() => useAuth(), {
            wrapper: TestWrapper,
          })
          
          await waitFor(() => {
            expect(result.current.loading).toBe(false)
          })
          
          // Mock error for valid email format
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: {
              name: 'AuthError',
              message: 'Invalid login credentials',
              status: 400,
            },
          })
          
          const validEmailResult = await result.current.signIn({
            email: validEmail,
            password,
            rememberMe: false
          })
          
          // Mock error for invalid email format
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: {
              name: 'AuthError',
              message: 'Invalid email format',
              status: 400,
            },
          })
          
          const invalidEmailResult = await result.current.signIn({
            email: invalidEmail,
            password,
            rememberMe: false
          })
          
          // Both should return the same generic error message
          expect(validEmailResult.error).toBe('Invalid email or password')
          expect(invalidEmailResult.error).toBe('Invalid email or password')
          
          // Verify no distinction is made between valid/invalid email formats
          expect(validEmailResult.error).toBe(invalidEmailResult.error)
        }
      ),
      { numRuns: 10 }
    )
  })
})

// Helper functions to generate realistic error messages and status codes
function getErrorMessage(errorType: string): string {
  switch (errorType) {
    case 'invalid_credentials':
      return 'Invalid login credentials'
    case 'email_not_confirmed':
      return 'Email not confirmed'
    case 'too_many_requests':
      return 'Too many requests'
    case 'user_not_found':
      return 'User not found'
    case 'invalid_password':
      return 'Invalid password'
    default:
      return 'Authentication failed'
  }
}

function getErrorStatus(errorType: string): number {
  switch (errorType) {
    case 'invalid_credentials':
    case 'email_not_confirmed':
    case 'user_not_found':
    case 'invalid_password':
      return 400
    case 'too_many_requests':
      return 429
    default:
      return 400
  }
}

function getResetErrorMessage(errorType: string): string {
  switch (errorType) {
    case 'network_error':
      return 'Network error occurred'
    case 'rate_limit':
      return 'Rate limit exceeded'
    case 'service_unavailable':
      return 'Service temporarily unavailable'
    default:
      return 'Reset failed'
  }
}

function getResetErrorStatus(errorType: string): number {
  switch (errorType) {
    case 'network_error':
      return 500
    case 'rate_limit':
      return 429
    case 'service_unavailable':
      return 503
    default:
      return 400
  }
}