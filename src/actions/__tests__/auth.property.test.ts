/**
 * Property-based tests for authentication server actions
 * Feature: authentication-workspace, Property 5: Email Delivery Reliability
 * Validates: Requirements 1.5, 3.3, 5.2, 8.1, 8.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { signUpAction, resetPasswordAction, resendVerificationAction } from '../auth'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase server client
vi.mock('@/lib/supabase/server')

const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    resend: vi.fn(),
  },
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  vi.clearAllMocks()
})

// Helper to generate valid emails that pass Zod validation
const validEmailGenerator = fc.oneof(
  fc.constant('test@example.com'),
  fc.constant('user@domain.org'),
  fc.constant('admin@site.net'),
  fc.constant('demo@test.co'),
  fc.string({ minLength: 3, maxLength: 10 })
    .filter(s => /^[a-zA-Z0-9]+$/.test(s))
    .map(s => `${s}@example.com`)
)

afterEach(() => {
  vi.clearAllMocks()
})

describe('Email Delivery Reliability Property Tests', () => {
  /**
   * Property 5: Email Delivery Reliability
   * For any valid user action requiring email notification (registration, password reset, invitation),
   * the system should send the appropriate email within the specified time limit
   */
  
  it('Property 5.1: Registration email delivery consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
            /[A-Za-z]/.test(s) && /\d/.test(s)
          ),
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, password, fullName }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful signup with email sending
          mockSupabase.auth.signUp.mockResolvedValue({
            data: {
              user: {
                id: fc.sample(fc.uuid(), 1)[0],
                email: email.toLowerCase(),
                email_confirmed_at: null, // Not yet verified
              },
              session: null,
            },
            error: null,
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', password)
          formData.set('confirmPassword', password)
          formData.set('fullName', fullName)
          
          const startTime = Date.now()
          const result = await signUpAction(formData)
          const endTime = Date.now()
          
          // Verify email delivery was initiated (Requirement 1.5, 8.1)
          expect(mockSupabase.auth.signUp).toHaveBeenCalledTimes(1)
          const signupCall = mockSupabase.auth.signUp.mock.calls[0][0]
          expect(signupCall.email).toBe(email.toLowerCase())
          expect(signupCall.password).toBe(password)
          expect(signupCall.options.data.full_name).toBe(fullName.trim())
          expect(signupCall.options.emailRedirectTo).toContain('/auth/verify-email')
          
          // Verify success response indicates email was sent (Requirement 8.2)
          expect(result.error).toBeUndefined()
          expect(result.data?.message).toBe('Check your email for verification link')
          
          // Verify response time is reasonable (within 30 seconds as per Requirement 8.1)
          const responseTime = endTime - startTime
          expect(responseTime).toBeLessThan(30000) // 30 seconds
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 5.2: Password reset email delivery consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailGenerator,
        async (email) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful password reset email sending
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
            data: {},
            error: null,
          })
          
          const formData = new FormData()
          formData.set('email', email)
          
          const startTime = Date.now()
          const result = await resetPasswordAction(formData)
          const endTime = Date.now()
          
          // Verify email delivery was initiated (Requirement 3.3)
          expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1)
          const resetCall = mockSupabase.auth.resetPasswordForEmail.mock.calls[0]
          expect(resetCall[0]).toBe(email.toLowerCase())
          expect(resetCall[1].redirectTo).toContain('/auth/reset-password/confirm')
          
          // Verify consistent success message regardless of email existence (Requirement 3.4)
          expect(result.error).toBeUndefined()
          expect(result.data?.message).toBe(
            'If an account with that email exists, you will receive a password reset link.'
          )
          
          // Verify response time is reasonable (within 30 seconds as per Requirement 3.3)
          const responseTime = endTime - startTime
          expect(responseTime).toBeLessThan(30000) // 30 seconds
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 5.3: Verification email resend consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailGenerator,
        async (email) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful resend
          mockSupabase.auth.resend.mockResolvedValue({
            data: {},
            error: null,
          })
          
          const startTime = Date.now()
          const result = await resendVerificationAction(email)
          const endTime = Date.now()
          
          // Verify resend was initiated (Requirement 8.1, 8.2)
          expect(mockSupabase.auth.resend).toHaveBeenCalledTimes(1)
          const resendCall = mockSupabase.auth.resend.mock.calls[0][0]
          expect(resendCall.type).toBe('signup')
          expect(resendCall.email).toBe(email)
          expect(resendCall.options.emailRedirectTo).toContain('/auth/verify-email')
          
          // Verify success response
          expect(result.error).toBeUndefined()
          expect(result.data?.message).toBe('Verification email sent! Please check your inbox.')
          
          // Verify response time is reasonable (within 30 seconds)
          const responseTime = endTime - startTime
          expect(responseTime).toBeLessThan(30000) // 30 seconds
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 5.4: Email delivery error handling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          errorType: fc.oneof(
            fc.constant('network_error'),
            fc.constant('rate_limit'),
            fc.constant('invalid_email'),
            fc.constant('service_unavailable')
          ),
        }),
        async ({ email, errorType }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock different types of email delivery errors
          const mockError = {
            network_error: { message: 'Network error', status: 500 },
            rate_limit: { message: 'Rate limit exceeded', status: 429 },
            invalid_email: { message: 'Invalid email address', status: 400 },
            service_unavailable: { message: 'Service unavailable', status: 503 },
          }[errorType]
          
          // Test signup email error handling
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', 'ValidPass123')
          formData.set('confirmPassword', 'ValidPass123')
          formData.set('fullName', 'Test User')
          
          const signupResult = await signUpAction(formData)
          
          // Verify error is handled gracefully
          expect(signupResult.error).toBeDefined()
          expect(typeof signupResult.error === 'string' || typeof signupResult.error === 'object').toBe(true)
          
          // Test password reset email error handling
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
            data: {},
            error: mockError,
          })
          
          const resetFormData = new FormData()
          resetFormData.set('email', email)
          
          const resetResult = await resetPasswordAction(resetFormData)
          
          // Password reset should always return success for security (Requirement 3.4)
          expect(resetResult.error).toBeUndefined()
          expect(resetResult.data?.message).toBe(
            'If an account with that email exists, you will receive a password reset link.'
          )
          
          // Test resend verification error handling
          mockSupabase.auth.resend.mockResolvedValue({
            data: {},
            error: mockError,
          })
          
          const resendResult = await resendVerificationAction(email)
          
          // Verify error is handled gracefully
          expect(resendResult.error).toBeDefined()
          expect(typeof resendResult.error === 'string' || typeof resendResult.error === 'object').toBe(true)
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 5.5: Email content and redirect URL consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
            /[A-Za-z]/.test(s) && /\d/.test(s)
          ),
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, password, fullName }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful operations
          mockSupabase.auth.signUp.mockResolvedValue({
            data: {
              user: { id: fc.sample(fc.uuid(), 1)[0], email: email.toLowerCase() },
              session: null,
            },
            error: null,
          })
          
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
            data: {},
            error: null,
          })
          
          mockSupabase.auth.resend.mockResolvedValue({
            data: {},
            error: null,
          })
          
          // Test signup email redirect URL
          const signupFormData = new FormData()
          signupFormData.set('email', email)
          signupFormData.set('password', password)
          signupFormData.set('confirmPassword', password)
          signupFormData.set('fullName', fullName)
          
          await signUpAction(signupFormData)
          
          // Verify signup was called with correct structure (not specific values)
          expect(mockSupabase.auth.signUp).toHaveBeenCalled()
          const signupCalls = mockSupabase.auth.signUp.mock.calls
          const lastSignupCall = signupCalls[signupCalls.length - 1]
          expect(lastSignupCall[0].email).toBe(email.toLowerCase())
          expect(lastSignupCall[0].password).toBe(password)
          expect(lastSignupCall[0].options.data.full_name).toBe(fullName.trim())
          expect(lastSignupCall[0].options.emailRedirectTo).toContain('/auth/verify-email')
          
          // Test password reset email redirect URL
          const resetFormData = new FormData()
          resetFormData.set('email', email)
          
          await resetPasswordAction(resetFormData)
          
          expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalled()
          const resetCalls = mockSupabase.auth.resetPasswordForEmail.mock.calls
          const lastResetCall = resetCalls[resetCalls.length - 1]
          expect(lastResetCall[0]).toBe(email.toLowerCase())
          expect(lastResetCall[1].redirectTo).toContain('/auth/reset-password/confirm')
          
          // Test resend verification email redirect URL
          await resendVerificationAction(email)
          
          expect(mockSupabase.auth.resend).toHaveBeenCalled()
          const resendCalls = mockSupabase.auth.resend.mock.calls
          const lastResendCall = resendCalls[resendCalls.length - 1]
          expect(lastResendCall[0].type).toBe('signup')
          expect(lastResendCall[0].email).toBe(email)
          expect(lastResendCall[0].options.emailRedirectTo).toContain('/auth/verify-email')
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 5.6: Email delivery timing requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operations: fc.array(
            fc.oneof(
              fc.constant('signup'),
              fc.constant('reset'),
              fc.constant('resend')
            ),
            { minLength: 1, maxLength: 3 }
          ),
          email: validEmailGenerator,
        }),
        async ({ operations, email }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful operations
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: { id: fc.sample(fc.uuid(), 1)[0], email }, session: null },
            error: null,
          })
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
            data: {},
            error: null,
          })
          mockSupabase.auth.resend.mockResolvedValue({
            data: {},
            error: null,
          })
          
          const timings: number[] = []
          
          for (const operation of operations) {
            const startTime = Date.now()
            
            if (operation === 'signup') {
              const formData = new FormData()
              formData.set('email', email)
              formData.set('password', 'ValidPass123')
              formData.set('confirmPassword', 'ValidPass123')
              formData.set('fullName', 'Test User')
              
              await signUpAction(formData)
            } else if (operation === 'reset') {
              const formData = new FormData()
              formData.set('email', email)
              
              await resetPasswordAction(formData)
            } else if (operation === 'resend') {
              await resendVerificationAction(email)
            }
            
            const endTime = Date.now()
            timings.push(endTime - startTime)
          }
          
          // Verify all operations complete within reasonable time
          // Requirements 1.5 (30 seconds), 3.3 (30 seconds), 8.1 (30 seconds)
          for (const timing of timings) {
            expect(timing).toBeLessThan(30000) // 30 seconds
          }
          
          // Verify consistent performance across operations
          if (timings.length > 1) {
            const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length
            
            // Only check deviation if average timing is greater than 0
            if (avgTiming > 0) {
              const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTiming)))
              
              // Performance should be reasonably consistent (within 10x of average)
              expect(maxDeviation).toBeLessThan(avgTiming * 10)
            }
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})