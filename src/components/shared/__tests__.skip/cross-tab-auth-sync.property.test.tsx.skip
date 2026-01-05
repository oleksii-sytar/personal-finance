/**
 * Property-based tests for cross-tab authentication synchronization
 * Feature: auth-page-refresh-fix, Property 15: Cross-Tab Authentication Synchronization
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { AuthSyncManager } from '../auth-sync-manager'

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

// Import mocked modules
import { useAuth } from '@/contexts/auth-context'
import { sessionManager } from '@/lib/session/session-manager'

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock window methods
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: {
    pathname: '/dashboard',
    href: '',
    reload: vi.fn(),
  },
  dispatchEvent: vi.fn(),
}

// Mock document methods
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  hidden: false,
}

describe('AuthSyncManager Cross-Tab Synchronization Properties', () => {
  const mockUseAuth = vi.mocked(useAuth)
  const mockSessionManager = vi.mocked(sessionManager)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global mocks
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage })
    Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage })
    Object.defineProperty(global, 'window', { value: mockWindow })
    Object.defineProperty(global, 'document', { value: mockDocument })
    
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 15: Cross-Tab Authentication Synchronization
   * For any authentication state change in one browser tab, all other tabs should be updated consistently
   * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
   */
  it('should synchronize authentication state changes across tabs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          authStateChange: fc.constantFrom('SIGN_OUT', 'SIGN_IN', 'SESSION_EXPIRED', 'WORKSPACE_CHANGED'),
          tabId: fc.string({ minLength: 5, maxLength: 10 }),
          currentTabId: fc.string({ minLength: 5, maxLength: 10 }),
          userData: fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          }),
          sessionValid: fc.boolean(),
        }),
        async ({ authStateChange, tabId, currentTabId, userData, sessionValid }) => {
          // Arrange: Set up different tab IDs to simulate cross-tab scenario
          mockSessionStorage.getItem.mockReturnValue(currentTabId)
          
          const mockSignOut = vi.fn()
          const mockValidateSession = vi.fn().mockResolvedValue(sessionValid)
          
          mockUseAuth.mockReturnValue({
            user: userData,
            session: { user: userData } as any,
            loading: false,
            isAuthenticated: true,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: mockSignOut,
            resetPassword: vi.fn(),
            validateSession: mockValidateSession,
          })

          // Render the AuthSyncManager
          render(<AuthSyncManager />)

          // Act: Simulate storage event from another tab
          const storageEvent = new StorageEvent('storage', {
            key: 'auth-state-change',
            newValue: JSON.stringify({
              type: authStateChange,
              data: { userId: userData.id },
              timestamp: Date.now(),
              tabId: tabId, // Different from currentTabId
            }),
          })

          // Simulate the storage event handler
          const storageHandler = mockWindow.addEventListener.mock.calls.find(
            call => call[0] === 'storage'
          )?.[1]

          if (storageHandler) {
            await act(async () => {
              storageHandler(storageEvent)
            })
          }

          // Assert: Verify appropriate action was taken based on auth state change
          switch (authStateChange) {
            case 'SIGN_OUT':
              expect(mockSignOut).toHaveBeenCalled()
              break
            case 'SIGN_IN':
              expect(mockWindow.location.reload).toHaveBeenCalled()
              break
            case 'SESSION_EXPIRED':
              expect(mockSessionManager.clearSession).toHaveBeenCalled()
              break
            case 'WORKSPACE_CHANGED':
              expect(mockWindow.location.reload).toHaveBeenCalled()
              break
          }

          // Verify that localStorage operations were called for broadcasting
          expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'auth-state-change',
            expect.stringContaining(authStateChange)
          )
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle session validation on tab visibility changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isSessionValid: fc.boolean(),
          hasSession: fc.boolean(),
          documentHidden: fc.boolean(),
        }),
        async ({ isSessionValid, hasSession, documentHidden }) => {
          // Arrange
          const mockValidateSession = vi.fn().mockResolvedValue(isSessionValid)
          
          mockUseAuth.mockReturnValue({
            user: hasSession ? { id: 'user-123' } : null,
            session: hasSession ? { user: { id: 'user-123' } } : null,
            loading: false,
            isAuthenticated: hasSession,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: mockValidateSession,
          })

          mockDocument.hidden = documentHidden

          // Render the AuthSyncManager
          render(<AuthSyncManager />)

          // Act: Simulate visibility change event
          const visibilityHandler = mockDocument.addEventListener.mock.calls.find(
            call => call[0] === 'visibilitychange'
          )?.[1]

          if (visibilityHandler) {
            // Simulate tab becoming visible
            mockDocument.hidden = false
            
            await act(async () => {
              visibilityHandler()
            })
          }

          // Assert: Session validation should be called when tab becomes visible and has session
          if (hasSession && !documentHidden) {
            await waitFor(() => {
              expect(mockValidateSession).toHaveBeenCalled()
            })
          }

          // If session is invalid, session should be cleared
          if (hasSession && !isSessionValid) {
            await waitFor(() => {
              expect(mockSessionManager.clearSession).toHaveBeenCalled()
            })
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should broadcast authentication changes when user state changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialUser: fc.option(fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          })),
          newUser: fc.option(fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
          })),
          sessionState: fc.constantFrom(null, 'loading', 'authenticated'),
        }),
        async ({ initialUser, newUser, sessionState }) => {
          // Arrange: Start with initial user state
          const { rerender } = render(<AuthSyncManager />)

          mockUseAuth.mockReturnValue({
            user: initialUser || null,
            session: sessionState === 'authenticated' ? { user: initialUser } : null,
            loading: sessionState === 'loading',
            isAuthenticated: !!initialUser,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn(),
          })

          // Act: Change user state
          mockUseAuth.mockReturnValue({
            user: newUser || null,
            session: newUser ? { user: newUser } : null,
            loading: false,
            isAuthenticated: !!newUser,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            validateSession: vi.fn(),
          })

          rerender(<AuthSyncManager />)

          // Assert: Verify appropriate broadcast was made
          if (newUser && !initialUser) {
            // User signed in
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              'auth-state-change',
              expect.stringContaining('SIGN_IN')
            )
          } else if (!newUser && initialUser && sessionState !== 'loading') {
            // User signed out
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              'auth-state-change',
              expect.stringContaining('SIGN_OUT')
            )
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should ignore messages from the same tab', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tabId: fc.string({ minLength: 5, maxLength: 10 }),
          authStateChange: fc.constantFrom('SIGN_OUT', 'SIGN_IN', 'SESSION_EXPIRED'),
        }),
        async ({ tabId, authStateChange }) => {
          // Arrange: Set same tab ID for current tab and message
          mockSessionStorage.getItem.mockReturnValue(tabId)
          
          const mockSignOut = vi.fn()
          mockUseAuth.mockReturnValue({
            user: { id: 'user-123' },
            session: { user: { id: 'user-123' } } as any,
            loading: false,
            isAuthenticated: true,
            signIn: vi.fn(),
            signUp: vi.fn(),
            signOut: mockSignOut,
            resetPassword: vi.fn(),
            validateSession: vi.fn(),
          })

          render(<AuthSyncManager />)

          // Act: Simulate storage event from the same tab
          const storageEvent = new StorageEvent('storage', {
            key: 'auth-state-change',
            newValue: JSON.stringify({
              type: authStateChange,
              data: { userId: 'user-123' },
              timestamp: Date.now(),
              tabId: tabId, // Same as currentTabId
            }),
          })

          const storageHandler = mockWindow.addEventListener.mock.calls.find(
            call => call[0] === 'storage'
          )?.[1]

          if (storageHandler) {
            await act(async () => {
              storageHandler(storageEvent)
            })
          }

          // Assert: No action should be taken for messages from the same tab
          expect(mockSignOut).not.toHaveBeenCalled()
          expect(mockWindow.location.reload).not.toHaveBeenCalled()
          expect(mockSessionManager.clearSession).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 30 }
    )
  })
})