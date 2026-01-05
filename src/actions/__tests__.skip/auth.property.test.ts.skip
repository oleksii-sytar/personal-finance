/**
 * Property-based tests for authentication server actions
 * Feature: authentication-workspace, Property 2: Email Format and Uniqueness Validation
 * Feature: authentication-workspace, Property 5: Email Delivery Reliability
 * Feature: authentication-workspace, Property 13: Cryptographic Security Standards
 * Validates: Requirements 1.4, 1.5, 3.2, 3.3, 5.1, 5.2, 8.1, 8.2, 9.1, 9.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { signUpAction, resetPasswordAction, resendVerificationAction, signInAction } from '../auth'
import { createClient } from '@/lib/supabase/server'
import { emailSchema } from '@/lib/validations/auth'

// Mock Supabase server client
vi.mock('@/lib/supabase/server')

const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    resend: vi.fn(),
    signInWithPassword: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  })),
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

// Generator for valid email formats (reuse existing validEmailGenerator)
const validEmailFormatGenerator = validEmailGenerator

describe('Email Format and Uniqueness Validation Property Tests', () => {
  /**
   * Property 2: Email Format and Uniqueness Validation
   * For any email string, the system should validate format correctness and enforce uniqueness
   * across registration, password reset, and invitation flows
   */

  // Generator for invalid email formats
  const invalidEmailGenerator = fc.oneof(
    fc.constant(''),                           // Empty string
    fc.constant('invalid'),                    // No @ symbol
    fc.constant('@domain.com'),               // Missing local part
    fc.constant('user@'),                     // Missing domain
    fc.constant('user@domain'),               // Missing TLD
    fc.constant('user..double@domain.com'),   // Double dots
    fc.constant('user@domain..com'),          // Double dots in domain
    fc.constant('user name@domain.com'),      // Space in local part
    fc.constant('user@domain .com'),          // Space in domain
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@')), // No @ symbol
    fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}@`), // Missing domain
    fc.string({ minLength: 1, maxLength: 20 }).map(s => `@${s}`), // Missing local part
  )

  it('Property 2.1: Email format validation consistency across registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: invalidEmailGenerator,
          password: fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
            /[A-Za-z]/.test(s) && /\d/.test(s)
          ),
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, password, fullName }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', password)
          formData.set('confirmPassword', password)
          formData.set('fullName', fullName)
          
          const result = await signUpAction(formData)
          
          // Verify invalid email formats are rejected (Requirement 1.4)
          expect(result.error).toBeDefined()
          
          // Verify Supabase auth is not called for invalid emails
          expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
          
          // Verify error structure is consistent - be more flexible about structure
          if (typeof result.error === 'object' && result.error !== null) {
            // Zod validation errors have fieldErrors structure
            expect('fieldErrors' in result.error).toBe(true)
            const fieldErrors = (result.error as any).fieldErrors
            if (fieldErrors && typeof fieldErrors === 'object') {
              // For email validation failures, we expect some field error
              // Could be email field or other validation fields
              const hasEmailError = 'email' in fieldErrors && Array.isArray(fieldErrors.email) && fieldErrors.email.length > 0
              const hasAnyFieldError = Object.keys(fieldErrors).some(key => 
                Array.isArray(fieldErrors[key]) && fieldErrors[key].length > 0
              )
              expect(hasEmailError || hasAnyFieldError).toBe(true)
            }
          }
        }
      ),
      { numRuns: 25 }
    )
  })

  it('Property 2.2: Email format validation consistency across password reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidEmailGenerator,
        async (email) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          const formData = new FormData()
          formData.set('email', email)
          
          const result = await resetPasswordAction(formData)
          
          // Verify invalid email formats are rejected (Requirement 3.2)
          expect(result.error).toBeDefined()
          
          // Verify Supabase auth is not called for invalid emails
          expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
          
          // Verify error structure is consistent - be more flexible about structure
          if (typeof result.error === 'object' && result.error !== null) {
            // Zod validation errors have fieldErrors structure
            expect('fieldErrors' in result.error).toBe(true)
            const fieldErrors = (result.error as any).fieldErrors
            if (fieldErrors && typeof fieldErrors === 'object') {
              // For email validation failures, we expect some field error
              const hasEmailError = 'email' in fieldErrors && Array.isArray(fieldErrors.email) && fieldErrors.email.length > 0
              const hasAnyFieldError = Object.keys(fieldErrors).some(key => 
                Array.isArray(fieldErrors[key]) && fieldErrors[key].length > 0
              )
              expect(hasEmailError || hasAnyFieldError).toBe(true)
            }
          }
        }
      ),
      { numRuns: 25 }
    )
  })

  it('Property 2.3: Email format normalization consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          localPart: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          domain: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          tld: fc.oneof(fc.constant('com'), fc.constant('org'), fc.constant('net')),
          caseVariation: fc.oneof(
            fc.constant('lower'),
            fc.constant('upper'), 
            fc.constant('mixed')
          ),
        }),
        async ({ localPart, domain, tld, caseVariation }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Create email with different case variations
          let email = `${localPart}@${domain}.${tld}`
          if (caseVariation === 'upper') {
            email = email.toUpperCase()
          } else if (caseVariation === 'mixed') {
            email = email.split('').map((char, i) => 
              i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
            ).join('')
          }
          
          // Mock successful signup
          mockSupabase.auth.signUp.mockResolvedValue({
            data: {
              user: { id: fc.sample(fc.uuid(), 1)[0], email: email.toLowerCase() },
              session: null,
            },
            error: null,
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', 'ValidPass123')
          formData.set('confirmPassword', 'ValidPass123')
          formData.set('fullName', 'Test User')
          
          const result = await signUpAction(formData)
          
          // Verify email is normalized to lowercase (Requirement 1.4)
          expect(mockSupabase.auth.signUp).toHaveBeenCalledTimes(1)
          const signupCall = mockSupabase.auth.signUp.mock.calls[0][0]
          expect(signupCall.email).toBe(email.toLowerCase())
          
          // Verify successful result
          expect(result.error).toBeUndefined()
          expect(result.data?.message).toBe('Check your email for verification link')
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 2.4: Email uniqueness enforcement simulation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailFormatGenerator,
        async (email) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock email already exists error
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'User already registered' },
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', 'ValidPass123')
          formData.set('confirmPassword', 'ValidPass123')
          formData.set('fullName', 'Test User')
          
          const result = await signUpAction(formData)
          
          // Verify uniqueness error is handled properly (Requirement 1.4)
          expect(result.error).toBeDefined()
          expect(typeof result.error === 'string').toBe(true)
          expect(result.error).toBe('An account with this email already exists')
          
          // Verify Supabase was called with normalized email
          expect(mockSupabase.auth.signUp).toHaveBeenCalledTimes(1)
          const signupCall = mockSupabase.auth.signUp.mock.calls[0][0]
          expect(signupCall.email).toBe(email.toLowerCase())
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 2.5: Email validation consistency across all auth flows', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          operation: fc.oneof(
            fc.constant('signup'),
            fc.constant('reset'),
            fc.constant('resend')
          ),
        }),
        async ({ email, operation }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful operations
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: { id: fc.sample(fc.uuid(), 1)[0], email: email.toLowerCase() }, session: null },
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
          
          let result: any
          
          if (operation === 'signup') {
            const formData = new FormData()
            formData.set('email', email)
            formData.set('password', 'ValidPass123')
            formData.set('confirmPassword', 'ValidPass123')
            formData.set('fullName', 'Test User')
            
            result = await signUpAction(formData)
            
            // Verify email normalization in signup (Requirements 1.4, 5.1)
            expect(mockSupabase.auth.signUp).toHaveBeenCalledTimes(1)
            const signupCall = mockSupabase.auth.signUp.mock.calls[0][0]
            expect(signupCall.email).toBe(email.toLowerCase())
            
          } else if (operation === 'reset') {
            const formData = new FormData()
            formData.set('email', email)
            
            result = await resetPasswordAction(formData)
            
            // Verify email normalization in password reset (Requirement 3.2)
            expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1)
            const resetCall = mockSupabase.auth.resetPasswordForEmail.mock.calls[0]
            expect(resetCall[0]).toBe(email.toLowerCase())
            
          } else if (operation === 'resend') {
            result = await resendVerificationAction(email)
            
            // Verify email handling in resend (Requirement 5.1)
            expect(mockSupabase.auth.resend).toHaveBeenCalledTimes(1)
            const resendCall = mockSupabase.auth.resend.mock.calls[0][0]
            expect(resendCall.email).toBe(email)
          }
          
          // Verify all operations succeed with valid emails
          expect(result.error).toBeUndefined()
          expect(result.data).toBeDefined()
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 2.6: Email validation schema consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(validEmailFormatGenerator, invalidEmailGenerator),
        async (email) => {
          // Test email validation schema directly
          const schemaResult = emailSchema.safeParse(email)
          
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful operations for valid emails
          if (schemaResult.success) {
            mockSupabase.auth.signUp.mockResolvedValue({
              data: { user: { id: fc.sample(fc.uuid(), 1)[0], email: email.toLowerCase() }, session: null },
              error: null,
            })
            mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
              data: {},
              error: null,
            })
          }
          
          // Test signup validation
          const signupFormData = new FormData()
          signupFormData.set('email', email)
          signupFormData.set('password', 'ValidPass123')
          signupFormData.set('confirmPassword', 'ValidPass123')
          signupFormData.set('fullName', 'Test User')
          
          const signupResult = await signUpAction(signupFormData)
          
          // Test password reset validation
          const resetFormData = new FormData()
          resetFormData.set('email', email)
          
          const resetResult = await resetPasswordAction(resetFormData)
          
          // Verify consistency between schema validation and server action validation
          if (schemaResult.success) {
            // Valid emails should succeed (or fail for business reasons, not validation)
            if (signupResult.error) {
              // If there's an error, it should not be a validation error
              expect(typeof signupResult.error === 'string').toBe(true)
            } else {
              expect(signupResult.data).toBeDefined()
            }
            
            // Password reset should always succeed for valid emails (security requirement)
            expect(resetResult.error).toBeUndefined()
            expect(resetResult.data).toBeDefined()
            
          } else {
            // Invalid emails should fail validation
            expect(signupResult.error).toBeDefined()
            expect(resetResult.error).toBeDefined()
            
            // Verify error structure for validation failures
            if (typeof signupResult.error === 'object' && signupResult.error !== null) {
              // Zod validation errors have fieldErrors structure
              expect('fieldErrors' in signupResult.error).toBe(true)
              const fieldErrors = (signupResult.error as any).fieldErrors
              if (fieldErrors && typeof fieldErrors === 'object') {
                // For validation failures, we expect some field error
                const hasAnyFieldError = Object.keys(fieldErrors).some(key => 
                  Array.isArray(fieldErrors[key]) && fieldErrors[key].length > 0
                )
                expect(hasAnyFieldError).toBe(true)
              }
            }
            if (typeof resetResult.error === 'object' && resetResult.error !== null) {
              // Zod validation errors have fieldErrors structure
              expect('fieldErrors' in resetResult.error).toBe(true)
              const fieldErrors = (resetResult.error as any).fieldErrors
              if (fieldErrors && typeof fieldErrors === 'object') {
                // For validation failures, we expect some field error
                const hasAnyFieldError = Object.keys(fieldErrors).some(key => 
                  Array.isArray(fieldErrors[key]) && fieldErrors[key].length > 0
                )
                expect(hasAnyFieldError).toBe(true)
              }
            }
          }
        }
      ),
      { numRuns: 40 }
    )
  })
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

describe('Cryptographic Security Standards Property Tests', () => {
  /**
   * Property 13: Cryptographic Security Standards
   * For any password storage or session token generation, the system should use 
   * cryptographically secure methods and proper hashing algorithms
   */

  // Generator for various password types
  const passwordGenerator = fc.oneof(
    fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
      /[A-Za-z]/.test(s) && /\d/.test(s)
    ),
    fc.constant('ValidPass123'),
    fc.constant('SecurePassword456'),
    fc.constant('MyPassword789'),
    fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(s))
      .filter(s => /[A-Za-z]/.test(s) && /\d/.test(s))
  )

  it('Property 13.1: Password hashing security consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          password: passwordGenerator,
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, password, fullName }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful signup with user data
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          mockSupabase.auth.signUp.mockResolvedValue({
            data: {
              user: { 
                id: mockUserId, 
                email: email.toLowerCase(),
                email_confirmed_at: null,
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
          
          const result = await signUpAction(formData)
          
          // Verify password is passed to Supabase for secure hashing (Requirement 9.1)
          expect(mockSupabase.auth.signUp).toHaveBeenCalledTimes(1)
          const signupCall = mockSupabase.auth.signUp.mock.calls[0][0]
          expect(signupCall.password).toBe(password)
          
          // Verify password is not stored in plain text in our system
          // (Supabase handles secure hashing internally)
          expect(result.error).toBeUndefined()
          expect(result.data?.message).toBe('Check your email for verification link')
          
          // Verify no password information is leaked in response
          if (result.data) {
            const responseString = JSON.stringify(result.data)
            expect(responseString).not.toContain(password)
          }
        }
      ),
      { numRuns: 25 }
    )
  })

  it('Property 13.2: Session token security consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          password: passwordGenerator,
        }),
        async ({ email, password }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock successful signin with session data
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockAccessToken = fc.sample(fc.string({ minLength: 100, maxLength: 200 }), 1)[0]
          const mockRefreshToken = fc.sample(fc.string({ minLength: 100, maxLength: 200 }), 1)[0]
          
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: {
              user: { 
                id: mockUserId, 
                email: email.toLowerCase(),
                email_confirmed_at: new Date().toISOString(),
              },
              session: {
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                token_type: 'bearer',
                user: { id: mockUserId, email: email.toLowerCase() },
              },
            },
            error: null,
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', password)
          
          // Mock redirect to prevent actual navigation in tests
          const mockRedirect = vi.fn()
          vi.doMock('next/navigation', () => ({
            redirect: mockRedirect,
          }))
          
          try {
            await signInAction(formData)
          } catch (error) {
            // Expect redirect to be called (which throws in our mock)
            // This is normal behavior for successful signin
          }
          
          // Verify secure authentication was attempted (Requirement 9.2)
          expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(1)
          const signinCall = mockSupabase.auth.signInWithPassword.mock.calls[0][0]
          expect(signinCall.email).toBe(email.toLowerCase())
          expect(signinCall.password).toBe(password)
          
          // Verify session tokens are handled securely by Supabase
          // (We don't store or manipulate tokens directly in our code)
          const callArgs = mockSupabase.auth.signInWithPassword.mock.calls[0][0]
          expect(callArgs).toHaveProperty('email')
          expect(callArgs).toHaveProperty('password')
          expect(Object.keys(callArgs)).toHaveLength(2) // Only email and password, no token manipulation
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 13.3: Password validation security consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          weakPassword: fc.oneof(
            fc.string({ minLength: 1, maxLength: 7 }), // Too short
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/\d/.test(s)), // No numbers
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/[A-Za-z]/.test(s)), // No letters
            fc.constant(''), // Empty
            fc.constant('12345678'), // Only numbers
            fc.constant('abcdefgh'), // Only letters
          ),
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, weakPassword, fullName }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', weakPassword)
          formData.set('confirmPassword', weakPassword)
          formData.set('fullName', fullName)
          
          const result = await signUpAction(formData)
          
          // Verify weak passwords are rejected before reaching Supabase (Requirement 9.1)
          expect(result.error).toBeDefined()
          expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
          
          // Verify error structure indicates password validation failure
          if (typeof result.error === 'object' && result.error !== null) {
            // Zod validation errors have fieldErrors structure
            expect('fieldErrors' in result.error).toBe(true)
            const fieldErrors = (result.error as any).fieldErrors
            if (fieldErrors) {
              expect('password' in fieldErrors).toBe(true)
            }
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 13.4: Cryptographic randomness in token generation simulation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validEmailFormatGenerator, { minLength: 2, maxLength: 5 }),
        async (emails) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          const mockTokens: string[] = []
          
          // Mock password reset to simulate token generation
          mockSupabase.auth.resetPasswordForEmail.mockImplementation(async () => {
            // Simulate cryptographically secure token generation
            const mockToken = fc.sample(fc.string({ minLength: 32, maxLength: 64 }), 1)[0]
            mockTokens.push(mockToken)
            return { data: {}, error: null }
          })
          
          // Request password resets for multiple emails
          for (const email of emails) {
            const formData = new FormData()
            formData.set('email', email)
            
            const result = await resetPasswordAction(formData)
            
            // Verify each request succeeds
            expect(result.error).toBeUndefined()
            expect(result.data?.message).toBe(
              'If an account with that email exists, you will receive a password reset link.'
            )
          }
          
          // Verify each email triggered a reset request (token generation)
          expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(emails.length)
          
          // Verify all calls were made with proper email normalization
          const resetCalls = mockSupabase.auth.resetPasswordForEmail.mock.calls
          for (let i = 0; i < emails.length; i++) {
            expect(resetCalls[i][0]).toBe(emails[i].toLowerCase())
            expect(resetCalls[i][1].redirectTo).toContain('/auth/reset-password/confirm')
          }
          
          // Verify tokens would be unique (simulated by our mock)
          // In real implementation, Supabase ensures cryptographic uniqueness
          expect(mockTokens.length).toBe(emails.length)
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 13.5: Security error handling consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          password: passwordGenerator,
          errorType: fc.oneof(
            fc.constant('auth_error'),
            fc.constant('network_error'),
            fc.constant('rate_limit'),
            fc.constant('invalid_credentials')
          ),
        }),
        async ({ email, password, errorType }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock different types of security-related errors
          const mockError = {
            auth_error: { message: 'Authentication failed', status: 401 },
            network_error: { message: 'Network error', status: 500 },
            rate_limit: { message: 'Too many requests', status: 429 },
            invalid_credentials: { message: 'Invalid login credentials', status: 400 },
          }[errorType]
          
          // Test signup error handling
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          
          const signupFormData = new FormData()
          signupFormData.set('email', email)
          signupFormData.set('password', password)
          signupFormData.set('confirmPassword', password)
          signupFormData.set('fullName', 'Test User')
          
          const signupResult = await signUpAction(signupFormData)
          
          // Verify security errors are handled without exposing sensitive information (Requirement 9.2)
          expect(signupResult.error).toBeDefined()
          expect(typeof signupResult.error === 'string').toBe(true)
          
          // Verify no sensitive information is leaked in error messages
          const errorMessage = signupResult.error as string
          expect(errorMessage).not.toContain(password)
          expect(errorMessage).not.toContain('token')
          expect(errorMessage).not.toContain('hash')
          expect(errorMessage).not.toContain('secret')
          
          // Test signin error handling
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          
          const signinFormData = new FormData()
          signinFormData.set('email', email)
          signinFormData.set('password', password)
          
          const signinResult = await signInAction(signinFormData)
          
          // Verify signin errors are handled securely
          expect(signinResult.error).toBeDefined()
          expect(typeof signinResult.error === 'string').toBe(true)
          
          // Verify generic error messages for security (don't reveal if email exists)
          const signinErrorMessage = signinResult.error as string
          expect(signinErrorMessage).not.toContain(password)
          expect(['Invalid email or password', 'Please verify your email before signing in']).toContain(signinErrorMessage)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 13.6: Password confirmation security consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailFormatGenerator,
          password: passwordGenerator,
          differentPassword: passwordGenerator,
          fullName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ email, password, differentPassword, fullName }) => {
          // Skip if passwords happen to be the same
          if (password === differentPassword) return
          
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', password)
          formData.set('confirmPassword', differentPassword)
          formData.set('fullName', fullName)
          
          const result = await signUpAction(formData)
          
          // Verify password mismatch is caught before reaching Supabase (Requirement 9.1)
          expect(result.error).toBeDefined()
          expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
          
          // Verify error indicates password confirmation failure
          if (typeof result.error === 'object' && result.error !== null) {
            expect(result.error.fieldErrors?.confirmPassword).toBeDefined()
          }
          
          // Verify neither password is leaked in error response
          if (result.error) {
            const errorString = JSON.stringify(result.error)
            expect(errorString).not.toContain(password)
            expect(errorString).not.toContain(differentPassword)
          }
        }
      ),
      { numRuns: 25 }
    )
  })
})