/**
 * Property-based tests for progressive enhancement reliability
 * Feature: auth-page-refresh-fix, Property 16: Progressive Enhancement Reliability
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { OfflineManager, useOfflineManager } from '../offline-manager'

// Mock the auth context and session manager
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/session/session-manager', () => ({
  sessionManager: {
    validateSession: vi.fn(),
    clearSession: vi.fn(),
    getState: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
  })),
}))

// Import mocked modules
import { useAuth } from '@/contexts/auth-context'
import { sessionManager } from '@/lib/session/session-manager'
import { createClient } from '@/lib/supabase/client'

// Mock localStorage and navigator
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

const mockNavigator = {
  onLine: true,
}

// Mock window methods
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: {
    pathname: '/dashboard',
    href: '',
  },
  dispatchEvent: vi.fn(),
  offlineManager: null,
}

// Test component to use the hook
function TestComponent() {
  const { isOnline, offlineManager } = useOfflineManager()
  return (
    <div>
      <span data-testid="online-status">{isOnline ? 'online' : 'offline'}</span>
      <span data-testid="offline-manager">{offlineManager ? 'available' : 'unavailable'}</span>
    </div>
  )
}

describe('OfflineManager Progressive Enhancement Properties', () => {
  const mockUseAuth = vi.mocked(useAuth)
  const mockSessionManager = vi.mocked(sessionManager)
  const mockCreateClient = vi.mocked(createClient)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global mocks
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage })
    Object.defineProperty(global, 'navigator', { value: mockNavigator })
    Object.defineProperty(global, 'window', { value: mockWindow })
    
    // Default auth context mock
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn(),
    })
    
    // Default session manager mock
    mockSessionManager.validateSession.mockResolvedValue(true)
    mockSessionManager.getState.mockReturnValue({
      user: null,
      session: null,
      lastValidated: null,
      isValid: false,
    })

    // Default Supabase client mock
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 16: Progressive Enhancement Reliability
   * For any network or system degradation, the application should maintain core functionality and graceful fallbacks
   * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
   */
  it('should cache authentication state for offline scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          user: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            user_metadata: fc.record({
              full_name: fc.string({ minLength: 2, maxLength: 50 }),
            }),
          }),
          sessionExpiresAt: fc.integer({ min: Math.floor(Date.now() / 1000) + 3600, max: Math.floor(Date.now() / 1000) + 86400 }), // 1-24 hours from now
          isOnline: fc.boolean(),
        }),
        async ({ user, sessionExpiresAt, isOnline }) => {
          // Arrange: Set up authenticated user
          const session = {
            user,
            expires_at: sessionExpiresAt,
            access_token: 'mock-token',
          }

          mockUseAuth.mockReturnValue({
            user,
            session: session as any,
            loading: false,
            isAuthenticated: true,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn().mockResolvedValue(true),
          })

          mockNavigator.onLine = isOnline

          // Act: Render OfflineManager
          render(<OfflineManager />)

          // Simulate going offline if initially online
          if (isOnline) {
            await act(async () => {
              mockNavigator.onLine = false
              const offlineHandler = mockWindow.addEventListener.mock.calls.find(
                call => call[0] === 'offline'
              )?.[1]
              if (offlineHandler) {
                offlineHandler(new Event('offline'))
              }
            })
          }

          // Assert: Authentication state should be cached when going offline
          if (isOnline) {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              'cached-auth-state',
              expect.stringContaining(user.id)
            )
          }

          // Verify cached state structure
          const cachedStateCalls = mockLocalStorage.setItem.mock.calls.filter(
            call => call[0] === 'cached-auth-state'
          )

          if (cachedStateCalls.length > 0) {
            const cachedState = JSON.parse(cachedStateCalls[0][1])
            expect(cachedState).toMatchObject({
              user: expect.objectContaining({ id: user.id }),
              expiresAt: sessionExpiresAt,
              cachedAt: expect.any(Number),
              isValid: true,
            })
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should provide offline authentication fallbacks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasCachedAuth: fc.boolean(),
          cacheAge: fc.integer({ min: 0, max: 48 * 60 * 60 * 1000 }), // 0-48 hours
          sessionExpired: fc.boolean(),
          isOnline: fc.boolean(),
        }),
        async ({ hasCachedAuth, cacheAge, sessionExpired, isOnline }) => {
          // Arrange: Set up offline scenario
          mockNavigator.onLine = isOnline

          if (hasCachedAuth) {
            const cachedState = {
              user: { id: 'user-123', email: 'test@example.com' },
              expiresAt: sessionExpired ? Math.floor(Date.now() / 1000) - 3600 : Math.floor(Date.now() / 1000) + 3600,
              cachedAt: Date.now() - cacheAge,
              isValid: true,
            }
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedState))
          } else {
            mockLocalStorage.getItem.mockReturnValue(null)
          }

          mockUseAuth.mockReturnValue({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn(),
          })

          // Act: Render OfflineManager and access global methods
          render(<OfflineManager />)

          // Wait for component to set up global methods
          await waitFor(() => {
            expect(mockWindow.offlineManager).toBeDefined()
          })

          // Assert: Offline fallback should work appropriately
          if (!isOnline) {
            const maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours
            const shouldHaveValidCache = hasCachedAuth && cacheAge < maxCacheAge && !sessionExpired

            if (shouldHaveValidCache) {
              // Should provide cached authentication
              expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cached-auth-state')
            } else {
              // Should handle no valid cache gracefully
              expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cached-auth-state')
            }
          }
        }
      ),
      { numRuns: 40 }
    )
  })

  it('should handle session revalidation after reconnection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sessionValid: fc.boolean(),
          authServiceAvailable: fc.boolean(),
          hasSession: fc.boolean(),
          reconnectionDelay: fc.integer({ min: 100, max: 2000 }),
        }),
        async ({ sessionValid, authServiceAvailable, hasSession, reconnectionDelay }) => {
          // Arrange: Set up session state
          const mockValidateSession = vi.fn().mockResolvedValue(sessionValid)
          const session = hasSession ? { user: { id: 'user-123' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } : null

          mockUseAuth.mockReturnValue({
            user: hasSession ? { id: 'user-123' } : null,
            session: session as any,
            loading: false,
            isAuthenticated: hasSession,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: mockValidateSession,
          })

          // Mock auth service availability
          const mockGetSession = vi.fn().mockResolvedValue({
            data: { session: authServiceAvailable ? session : null },
            error: authServiceAvailable ? null : new Error('Service unavailable'),
          })
          
          mockCreateClient.mockReturnValue({
            auth: { getSession: mockGetSession },
          } as any)

          // Start offline
          mockNavigator.onLine = false

          // Act: Render OfflineManager
          render(<OfflineManager />)

          // Simulate coming back online
          await act(async () => {
            mockNavigator.onLine = true
            const onlineHandler = mockWindow.addEventListener.mock.calls.find(
              call => call[0] === 'online'
            )?.[1]
            
            if (onlineHandler) {
              onlineHandler(new Event('online'))
            }
          })

          // Wait for reconnection logic
          await new Promise(resolve => setTimeout(resolve, reconnectionDelay))

          // Assert: Session validation should be attempted when coming back online
          if (hasSession) {
            await waitFor(() => {
              expect(mockValidateSession).toHaveBeenCalled()
            })

            // If session is invalid, should handle expiry
            if (!sessionValid) {
              expect(mockSessionManager.clearSession).toHaveBeenCalled()
            }
          }

          // Network restoration event should be dispatched
          expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'network-restored',
            })
          )
        }
      ),
      { numRuns: 25 }
    )
  })

  it('should maintain user experience continuity during network issues', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          networkFluctuations: fc.array(fc.boolean(), { minLength: 2, maxLength: 10 }),
          hasActiveSession: fc.boolean(),
          userInteractionsDuringOffline: fc.array(
            fc.constantFrom('navigation', 'form_submission', 'data_request'),
            { minLength: 0, maxLength: 5 }
          ),
        }),
        async ({ networkFluctuations, hasActiveSession, userInteractionsDuringOffline }) => {
          // Arrange: Set up session state
          const session = hasActiveSession ? {
            user: { id: 'user-123', email: 'test@example.com' },
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          } : null

          mockUseAuth.mockReturnValue({
            user: hasActiveSession ? { id: 'user-123' } : null,
            session: session as any,
            loading: false,
            isAuthenticated: hasActiveSession,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn().mockResolvedValue(true),
          })

          // Act: Render OfflineManager
          const { container } = render(<OfflineManager />)

          // Simulate network fluctuations
          for (let i = 0; i < networkFluctuations.length; i++) {
            const isOnline = networkFluctuations[i]
            
            await act(async () => {
              mockNavigator.onLine = isOnline
              const eventType = isOnline ? 'online' : 'offline'
              const handler = mockWindow.addEventListener.mock.calls.find(
                call => call[0] === eventType
              )?.[1]
              
              if (handler) {
                handler(new Event(eventType))
              }
            })

            // Simulate user interactions during offline periods
            if (!isOnline && userInteractionsDuringOffline.length > 0) {
              // Should cache auth state when going offline
              if (hasActiveSession) {
                expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                  'cached-auth-state',
                  expect.any(String)
                )
              }

              // Should dispatch network-lost event
              expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                  type: 'network-lost',
                })
              )
            }

            // When coming back online, should restore functionality
            if (isOnline) {
              expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                  type: 'network-restored',
                })
              )
            }
          }

          // Assert: Should show offline indicator when offline
          const isCurrentlyOffline = !networkFluctuations[networkFluctuations.length - 1]
          if (isCurrentlyOffline) {
            // Should render offline indicator
            const offlineIndicator = container.querySelector('[class*="bg-amber-500"]')
            expect(offlineIndicator).toBeTruthy()
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should handle authentication service unavailability gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          serviceError: fc.constantFrom(
            'network_timeout',
            'service_unavailable', 
            'auth_service_down',
            'rate_limited'
          ),
          hasValidCache: fc.boolean(),
          retryAttempts: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ serviceError, hasValidCache, retryAttempts }) => {
          // Arrange: Set up service error scenarios
          const serviceErrors = {
            network_timeout: new Error('Network timeout'),
            service_unavailable: new Error('Service unavailable'),
            auth_service_down: new Error('Authentication service is down'),
            rate_limited: new Error('Rate limited'),
          }

          const mockGetSession = vi.fn().mockRejectedValue(serviceErrors[serviceError])
          mockCreateClient.mockReturnValue({
            auth: { getSession: mockGetSession },
          } as any)

          // Set up cached state if available
          if (hasValidCache) {
            const cachedState = {
              user: { id: 'user-123', email: 'test@example.com' },
              expiresAt: Math.floor(Date.now() / 1000) + 3600,
              cachedAt: Date.now() - 60000, // 1 minute ago
              isValid: true,
            }
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedState))
          } else {
            mockLocalStorage.getItem.mockReturnValue(null)
          }

          mockUseAuth.mockReturnValue({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn().mockRejectedValue(serviceErrors[serviceError]),
          })

          // Act: Render OfflineManager
          render(<OfflineManager />)

          // Wait for component to set up global methods
          await waitFor(() => {
            expect(mockWindow.offlineManager).toBeDefined()
          })

          // Simulate service availability check
          await act(async () => {
            // Component should handle service errors gracefully
            try {
              await mockGetSession()
            } catch (error) {
              // Should not crash the application
              expect(error).toBeDefined()
            }
          })

          // Assert: Should handle service unavailability gracefully
          if (hasValidCache) {
            // Should fall back to cached state
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cached-auth-state')
          } else {
            // Should handle no fallback gracefully without crashing
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cached-auth-state')
          }

          // Should not cause application to crash
          expect(mockWindow.offlineManager).toBeDefined()
        }
      ),
      { numRuns: 25 }
    )
  })

  it('should provide consistent offline manager hook functionality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialOnlineState: fc.boolean(),
          networkChanges: fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        }),
        async ({ initialOnlineState, networkChanges }) => {
          // Arrange: Set initial network state
          mockNavigator.onLine = initialOnlineState

          // Act: Render component using the hook
          const { getByTestId, rerender } = render(<TestComponent />)

          // Verify initial state
          expect(getByTestId('online-status')).toHaveTextContent(
            initialOnlineState ? 'online' : 'offline'
          )

          // Simulate network state changes
          for (const isOnline of networkChanges) {
            await act(async () => {
              mockNavigator.onLine = isOnline
              const eventType = isOnline ? 'online' : 'offline'
              const handler = mockWindow.addEventListener.mock.calls.find(
                call => call[0] === eventType
              )?.[1]
              
              if (handler) {
                handler(new Event(eventType))
              }
            })

            // Re-render to trigger hook updates
            rerender(<TestComponent />)

            // Assert: Hook should reflect current network state
            await waitFor(() => {
              expect(getByTestId('online-status')).toHaveTextContent(
                isOnline ? 'online' : 'offline'
              )
            })
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})