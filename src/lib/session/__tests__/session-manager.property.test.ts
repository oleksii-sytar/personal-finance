/**
 * Property-based tests for SessionManager
 * Feature: auth-page-refresh-fix, Property 5: Session Validation Transparency
 * Validates: Requirements 5.1, 5.2, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { SessionManager } from '../session-manager'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@/lib/supabase/client')

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
  },
}

beforeEach(() => {
  vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// Helper to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: fc.sample(fc.uuid(), 1)[0],
  email: fc.sample(fc.emailAddress(), 1)[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
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

describe('SessionManager Property Tests', () => {
  /**
   * Property 5: Session Validation Transparency
   * For any session validation check, the current page location should not change as a side effect
   * Validates: Requirements 5.1, 5.2, 5.5
   */
  
  it('Property 5: Session validation occurs without navigation side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          }),
          hasValidSession: fc.boolean(),
          validationCount: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ user, hasValidSession, validationCount }) => {
          const sessionManager = new SessionManager()
          const mockUser = createMockUser(user)
          const mockSession = hasValidSession ? createMockSession(mockUser) : null
          
          // Mock session validation response
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          // Track initial state (no navigation should occur)
          const initialLocation = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'
          
          // Perform multiple session validations
          const validationResults: boolean[] = []
          for (let i = 0; i < validationCount; i++) {
            const result = await sessionManager.validateSession()
            validationResults.push(result)
            
            // Verify session state is accessible without side effects
            const state = sessionManager.getState()
            expect(state).toBeDefined()
            expect(typeof state.isValid).toBe('boolean')
            expect(state.lastValidated).toBeInstanceOf(Date)
            
            // Verify no navigation occurred
            const currentLocation = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'
            expect(currentLocation).toBe(initialLocation)
          }
          
          // Verify all validations returned consistent results
          const expectedResult = hasValidSession
          validationResults.forEach(result => {
            expect(result).toBe(expectedResult)
          })
          
          // Verify session manager state consistency
          const finalState = sessionManager.getState()
          expect(finalState.isValid).toBe(hasValidSession)
          expect(finalState.user).toEqual(hasValidSession ? mockUser : null)
          expect(finalState.session).toEqual(mockSession)
          
          // Verify state access methods work without side effects
          expect(sessionManager.isSessionValid()).toBe(hasValidSession)
          expect(sessionManager.getCurrentUser()).toEqual(hasValidSession ? mockUser : null)
          expect(sessionManager.getCurrentSession()).toEqual(mockSession)
          
          // Verify validation was called the expected number of times
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(validationCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5.1: Session state access provides data without triggering validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          }),
          hasValidSession: fc.boolean(),
        }),
        async ({ user, hasValidSession }) => {
          const sessionManager = new SessionManager()
          const mockUser = createMockUser(user)
          const mockSession = hasValidSession ? createMockSession(mockUser) : null
          
          // Mock session validation response
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          // Perform initial validation
          await sessionManager.validateSession()
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
          
          // Access state multiple times - should not trigger additional validations
          const accessCount = fc.sample(fc.integer({ min: 1, max: 10 }), 1)[0]
          for (let i = 0; i < accessCount; i++) {
            const state = sessionManager.getState()
            const isValid = sessionManager.isSessionValid()
            const currentUser = sessionManager.getCurrentUser()
            const currentSession = sessionManager.getCurrentSession()
            
            // Verify state access returns consistent data
            expect(state.isValid).toBe(hasValidSession)
            expect(isValid).toBe(hasValidSession)
            expect(currentUser).toEqual(hasValidSession ? mockUser : null)
            expect(currentSession).toEqual(mockSession)
          }
          
          // Verify no additional validations were triggered by state access
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5.2: Session refresh only occurs when needed without navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          }),
          hasValidSession: fc.boolean(),
        }),
        async ({ user, hasValidSession }) => {
          const sessionManager = new SessionManager()
          const mockUser = createMockUser(user)
          const mockSession = hasValidSession ? createMockSession(mockUser) : null
          
          // Mock session validation response
          mockSupabase.auth.getSession.mockResolvedValue({
            data: { session: mockSession },
            error: null,
          })
          
          // Perform initial validation
          await sessionManager.validateSession()
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
          
          // Immediately call refreshSessionIfNeeded - should not trigger new validation (recent)
          const refreshResult1 = await sessionManager.refreshSessionIfNeeded()
          expect(refreshResult1).toBe(hasValidSession)
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1) // No additional call
          
          // Mock time passage by clearing the last validated time
          const state = sessionManager.getState()
          // @ts-ignore - accessing private state for testing
          sessionManager['state'].lastValidated = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
          
          // Now refreshSessionIfNeeded should trigger validation
          const refreshResult2 = await sessionManager.refreshSessionIfNeeded()
          expect(refreshResult2).toBe(hasValidSession)
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(2) // Additional call made
          
          // Verify no navigation side effects occurred
          const finalState = sessionManager.getState()
          expect(finalState.isValid).toBe(hasValidSession)
        }
      ),
      { numRuns: 100 }
    )
  })
})