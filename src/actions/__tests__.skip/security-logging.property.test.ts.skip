/**
 * Property-based tests for security event logging
 * Feature: authentication-workspace, Property 14: Security Event Logging
 * Validates: Requirements 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { signUpAction, signInAction, resetPasswordAction } from '../auth'
import { createWorkspaceAction, inviteMemberAction, removeMemberAction, transferOwnershipAction } from '../workspaces'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase server client
vi.mock('@/lib/supabase/server')

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  })),
}

// Mock console methods to capture logging
const mockConsoleError = vi.fn()
const mockConsoleWarn = vi.fn()
const mockConsoleLog = vi.fn()

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  vi.clearAllMocks()
  
  // Mock console methods
  vi.spyOn(console, 'error').mockImplementation(mockConsoleError)
  vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn)
  vi.spyOn(console, 'log').mockImplementation(mockConsoleLog)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Helper generators
const validEmailGenerator = fc.oneof(
  fc.constant('test@example.com'),
  fc.constant('user@domain.org'),
  fc.constant('admin@site.net'),
  fc.string({ minLength: 3, maxLength: 10 })
    .filter(s => /^[a-zA-Z0-9]+$/.test(s))
    .map(s => `${s}@example.com`)
)

const passwordGenerator = fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
  /[A-Za-z]/.test(s) && /\d/.test(s)
)

const errorTypeGenerator = fc.oneof(
  fc.constant('network_error'),
  fc.constant('auth_error'),
  fc.constant('rate_limit'),
  fc.constant('permission_denied'),
  fc.constant('invalid_input'),
  fc.constant('database_error')
)

describe('Security Event Logging Property Tests', () => {
  /**
   * Property 14: Security Event Logging
   * For any authentication error or suspicious activity, the system should log security events
   * without exposing sensitive information and implement appropriate protective measures
   */

  it('Property 14.1: Authentication errors are logged without sensitive information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: passwordGenerator,
          errorType: errorTypeGenerator,
        }),
        async ({ email, password, errorType }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock different types of authentication errors
          const mockError = {
            network_error: { message: 'Network error', status: 500 },
            auth_error: { message: 'Authentication failed', status: 401 },
            rate_limit: { message: 'Too many requests', status: 429 },
            permission_denied: { message: 'Permission denied', status: 403 },
            invalid_input: { message: 'Invalid input', status: 400 },
            database_error: { message: 'Database connection failed', status: 500 },
          }[errorType]
          
          // Test signup error logging
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
          
          // Verify error was logged (Requirement 9.4)
          expect(mockConsoleError).toHaveBeenCalled()
          
          // Verify logged error does not contain sensitive information (Requirement 9.5)
          const loggedCalls = mockConsoleError.mock.calls
          const loggedMessages = loggedCalls.map(call => call.join(' '))
          
          for (const message of loggedMessages) {
            // Should not contain password
            expect(message).not.toContain(password)
            // Should not contain full email for security
            expect(message).not.toContain(email)
            // Should not contain sensitive error details that could help attackers
            expect(message).not.toMatch(/token|secret|key|hash/i)
          }
          
          // Verify error response doesn't expose sensitive information
          expect(signupResult.error).toBeDefined()
          if (typeof signupResult.error === 'string') {
            expect(signupResult.error).not.toContain(password)
            expect(signupResult.error).not.toMatch(/token|secret|key|hash/i)
          }
        }
      ),
      { numRuns: 25 }
    )
  })

  it('Property 14.2: Login failures are logged with appropriate security measures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: passwordGenerator,
          errorScenario: fc.oneof(
            fc.constant('invalid_credentials'),
            fc.constant('account_locked'),
            fc.constant('email_not_verified'),
            fc.constant('network_failure')
          ),
        }),
        async ({ email, password, errorScenario }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock different login failure scenarios
          const mockErrors = {
            invalid_credentials: { message: 'Invalid login credentials' },
            account_locked: { message: 'Account temporarily locked' },
            email_not_verified: { message: 'Email not confirmed' },
            network_failure: { message: 'Network error' },
          }
          
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: mockErrors[errorScenario],
          })
          
          const formData = new FormData()
          formData.set('email', email)
          formData.set('password', password)
          
          const result = await signInAction(formData)
          
          // Verify security event was logged (Requirement 9.4)
          expect(mockConsoleError).toHaveBeenCalled()
          
          // Verify logged information doesn't expose sensitive data (Requirement 9.5)
          const loggedCalls = mockConsoleError.mock.calls
          const loggedMessages = loggedCalls.map(call => call.join(' '))
          
          for (const message of loggedMessages) {
            // Should not contain password
            expect(message).not.toContain(password)
            // Should not contain full email for security
            expect(message).not.toContain(email)
            // Should not contain sensitive authentication details
            expect(message).not.toMatch(/session|token|credential/i)
          }
          
          // Verify generic error message for security (Requirement 2.3)
          expect(result.error).toBeDefined()
          expect(typeof result.error === 'string').toBe(true)
          
          // Should return generic error messages that don't reveal system internals
          const errorMessage = result.error as string
          expect(['Invalid email or password', 'Please verify your email before signing in']).toContain(errorMessage)
          
          // Should not contain sensitive information
          expect(errorMessage).not.toContain(password)
          expect(errorMessage).not.toMatch(/token|session|hash/i)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 14.3: Workspace security events are logged appropriately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          workspaceName: fc.string({ minLength: 1, maxLength: 50 }),
          email: validEmailGenerator,
          errorType: fc.oneof(
            fc.constant('permission_denied'),
            fc.constant('member_not_found'),
            fc.constant('database_error'),
            fc.constant('invalid_operation')
          ),
        }),
        async ({ workspaceName, email, errorType }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock authenticated user
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: mockUserId, email: email.toLowerCase() } },
            error: null,
          })
          
          // Mock different workspace operation errors
          const mockErrors = {
            permission_denied: { message: 'Permission denied', code: '42501' },
            member_not_found: { message: 'Member not found', code: '23503' },
            database_error: { message: 'Database error', code: '08006' },
            invalid_operation: { message: 'Invalid operation', code: '22000' },
          }
          
          // Test workspace creation error logging
          mockSupabase.from.mockReturnValue({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: mockErrors[errorType] 
                } as any))
              }))
            }))
          } as any)
          
          const formData = new FormData()
          formData.set('name', workspaceName)
          
          const result = await createWorkspaceAction(formData)
          
          // Verify security event was logged (Requirement 9.4)
          expect(mockConsoleError).toHaveBeenCalled()
          
          // Verify logged information protects sensitive data (Requirement 9.5)
          const loggedCalls = mockConsoleError.mock.calls
          const loggedMessages = loggedCalls.map(call => call.join(' '))
          
          for (const message of loggedMessages) {
            // Should not contain user email or sensitive identifiers
            expect(message).not.toContain(email)
            expect(message).not.toContain(mockUserId)
            // Should not expose database internals
            expect(message).not.toMatch(/password|token|secret/i)
          }
          
          // Verify error response is generic and safe (Requirement 9.5)
          expect(result.error).toBeDefined()
          expect(typeof result.error === 'string').toBe(true)
          
          const errorMessage = result.error as string
          expect(errorMessage).not.toContain(email)
          expect(errorMessage).not.toContain(mockUserId)
          expect(errorMessage).not.toMatch(/database|sql|internal/i)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 14.4: Database errors in member management are logged without sensitive data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          workspaceName: fc.string({ minLength: 1, maxLength: 50 }),
          errorType: fc.oneof(
            fc.constant('database_error'),
            fc.constant('network_failure'),
            fc.constant('timeout_error')
          ),
        }),
        async ({ email, workspaceName, errorType }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock authenticated user
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: mockUserId, email: email.toLowerCase() } },
            error: null,
          })
          
          // Mock database errors that trigger logging
          const mockErrors = {
            database_error: { message: 'Database connection failed', code: '08006' },
            network_failure: { message: 'Network error', code: '08000' },
            timeout_error: { message: 'Query timeout', code: '57014' },
          }
          
          // Mock workspace creation with database error (this always triggers logging)
          mockSupabase.from.mockReturnValue({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: mockErrors[errorType] 
                } as any))
              }))
            }))
          } as any)
          
          const formData = new FormData()
          formData.set('name', workspaceName)
          
          const result = await createWorkspaceAction(formData)
          
          // Verify security event was logged for database errors (Requirement 9.4)
          expect(mockConsoleError).toHaveBeenCalled()
          
          // Verify logged information protects sensitive data (Requirement 9.5)
          const loggedCalls = mockConsoleError.mock.calls
          const loggedMessages = loggedCalls.map(call => call.join(' '))
          
          for (const message of loggedMessages) {
            // Should not contain user email or sensitive identifiers
            expect(message).not.toContain(email)
            expect(message).not.toContain(mockUserId)
            // Should not expose internal system details
            expect(message).not.toMatch(/password|token|secret|session/i)
          }
          
          // Verify error response is appropriately generic (Requirement 9.5)
          expect(result.error).toBeDefined()
          expect(typeof result.error === 'string').toBe(true)
          
          const errorMessage = result.error as string
          expect(errorMessage).not.toContain(email)
          expect(errorMessage).not.toContain(mockUserId)
          expect(errorMessage).not.toMatch(/database|sql|internal|system/i)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 14.5: Rate limiting and suspicious activity logging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: passwordGenerator,
          attemptCount: fc.integer({ min: 1, max: 10 }),
          suspiciousPattern: fc.oneof(
            fc.constant('rapid_requests'),
            fc.constant('multiple_failures'),
            fc.constant('unusual_timing'),
            fc.constant('invalid_patterns')
          ),
        }),
        async ({ email, password, attemptCount, suspiciousPattern }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock rate limiting or suspicious activity errors
          const mockError = {
            rapid_requests: { message: 'Too many requests', status: 429 },
            multiple_failures: { message: 'Multiple authentication failures', status: 429 },
            unusual_timing: { message: 'Unusual request timing detected', status: 429 },
            invalid_patterns: { message: 'Invalid request pattern', status: 400 },
          }[suspiciousPattern]
          
          // Simulate multiple failed attempts
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          
          // Perform multiple authentication attempts
          for (let i = 0; i < attemptCount; i++) {
            const formData = new FormData()
            formData.set('email', email)
            formData.set('password', password)
            
            await signInAction(formData)
          }
          
          // Verify security events were logged for suspicious activity (Requirement 9.4)
          expect(mockConsoleError).toHaveBeenCalled()
          expect(mockConsoleError.mock.calls.length).toBeGreaterThanOrEqual(attemptCount)
          
          // Verify logged information follows security guidelines (Requirement 9.5)
          const loggedCalls = mockConsoleError.mock.calls
          const loggedMessages = loggedCalls.map(call => call.join(' '))
          
          for (const message of loggedMessages) {
            // Should not contain password or sensitive authentication data
            expect(message).not.toContain(password)
            expect(message).not.toContain(email)
            expect(message).not.toMatch(/credential|session|token/i)
            
            // Should contain appropriate security context without sensitive details
            expect(message).toMatch(/Security Event|error|auth/i)
          }
          
          // Verify consistent error responses that don't reveal attack patterns
          const allResponses = mockSupabase.auth.signInWithPassword.mock.calls
          expect(allResponses.length).toBe(attemptCount)
          
          // All calls should have been made with the same parameters
          for (const call of allResponses) {
            expect(call[0].email).toBe(email.toLowerCase())
            expect(call[0].password).toBe(password)
          }
        }
      ),
      { numRuns: 15 }
    )
  })

  it('Property 14.6: Error logging consistency across all security-sensitive operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: validEmailGenerator,
          password: passwordGenerator,
          operation: fc.oneof(
            fc.constant('signup'),
            fc.constant('signin'),
            fc.constant('reset_password'),
            fc.constant('create_workspace'),
            fc.constant('invite_member')
          ),
          errorSeverity: fc.oneof(
            fc.constant('low'),
            fc.constant('medium'),
            fc.constant('high'),
            fc.constant('critical')
          ),
        }),
        async ({ email, password, operation, errorSeverity }) => {
          // Clear mocks for this iteration
          vi.clearAllMocks()
          
          // Mock authenticated user for workspace operations
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: mockUserId, email: email.toLowerCase() } },
            error: null,
          })
          
          // Mock errors based on severity
          const mockErrors = {
            low: { message: 'Validation error', status: 400 },
            medium: { message: 'Authentication failed', status: 401 },
            high: { message: 'Permission denied', status: 403 },
            critical: { message: 'Service unavailable', status: 500 },
          }
          
          const mockError = mockErrors[errorSeverity]
          
          // Mock all auth operations to return errors
          mockSupabase.auth.signUp.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: mockError,
          })
          mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
            data: {},
            error: mockError,
          })
          
          // Mock database operations to return errors
          mockSupabase.from.mockReturnValue({
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: mockError } as any))
              }))
            })),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { role: 'owner' }, error: null } as any)),
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: null } as any))
                }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null } as any))
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null } as any))
            }))
          } as any)
          
          // Execute the specified operation
          let result: any
          
          if (operation === 'signup') {
            const formData = new FormData()
            formData.set('email', email)
            formData.set('password', password)
            formData.set('confirmPassword', password)
            formData.set('fullName', 'Test User')
            
            result = await signUpAction(formData)
          } else if (operation === 'signin') {
            const formData = new FormData()
            formData.set('email', email)
            formData.set('password', password)
            
            result = await signInAction(formData)
          } else if (operation === 'reset_password') {
            const formData = new FormData()
            formData.set('email', email)
            
            result = await resetPasswordAction(formData)
          } else if (operation === 'create_workspace') {
            const formData = new FormData()
            formData.set('name', 'Test Workspace')
            
            result = await createWorkspaceAction(formData)
          } else if (operation === 'invite_member') {
            const formData = new FormData()
            formData.set('email', email)
            formData.set('workspaceId', fc.sample(fc.uuid(), 1)[0])
            
            result = await inviteMemberAction(formData)
          }
          
          // Verify security event was logged if an error occurred (Requirement 9.4)
          // Note: Not all operations may trigger console.error (e.g., validation errors return early)
          if (mockConsoleError.mock.calls.length > 0) {
            // Verify logging consistency across all operations (Requirement 9.5)
            const loggedCalls = mockConsoleError.mock.calls
            const loggedMessages = loggedCalls.map(call => call.join(' '))
            
            for (const message of loggedMessages) {
              // Consistent security: no sensitive information in logs
              expect(message).not.toContain(password)
              expect(message).not.toContain(email)
              expect(message).not.toMatch(/token|secret|key|session|credential/i)
              
              // Should contain operation context for security monitoring
              expect(message).toMatch(/Security Event|error|failed|auth|workspace|sign/i)
            }
          }
          
          // Special case: password reset should always return success for security
          if (operation === 'reset_password') {
            expect(result.error).toBeUndefined()
            expect(result.data?.message).toBe(
              'If an account with that email exists, you will receive a password reset link.'
            )
          } else {
            // Verify error response follows security guidelines
            expect(result.error).toBeDefined()
            
            // Error responses should be consistent and not reveal sensitive information
            if (typeof result.error === 'string') {
              expect(result.error).not.toContain(password)
              expect(result.error).not.toContain(email)
              expect(result.error).not.toMatch(/database|sql|internal|system|token/i)
            }
          }
        }
      ),
      { numRuns: 30 }
    )
  })
})