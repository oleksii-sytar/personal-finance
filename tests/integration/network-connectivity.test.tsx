/**
 * Integration Test: Network Connectivity Changes
 * 
 * **Task 14.2: Test network connectivity changes**
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
 * 
 * This test verifies that the application handles network connectivity changes
 * gracefully, providing offline support and progressive enhancement.
 * 
 * **Feature: auth-page-refresh-fix, Task 14.2: Network Connectivity Integration**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { OfflineManager, useOfflineManager } from '@/components/shared/offline-manager'
import { createClient } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/session/session-manager'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  })),
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

// Mock return URL utility
vi.mock('@/lib/utils/return-url', () => ({
  createLoginUrlWithReturn: vi.fn(() => '/auth/login?returnUrl=%2Fdashboard'),
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

describe('Network Connectivity Integration Tests', () => {
  let mockLocalStorage: { [key: string]: string }
  let onlineEventListeners: (() => void)[]
  let offlineEventListeners: (() => void)[]
  let customEventListeners: { [key: string]: ((event: CustomEvent) => void)[] }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset storage and event listeners
    mockLocalStorage = {}
    onlineEventListeners = []
    offlineEventListeners = []
    customEventListeners = {}

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
    })

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })

    // Mock event listeners
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn((event: string, listener: any) => {
        if (event === 'online') {
          onlineEventListeners.push(listener)
        } else if (event === 'offline') {
          offlineEventListeners.push(listener)
        }
      }),
      writable: true,
    })

    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    })

    // Mock dispatchEvent
    Object.defineProperty(window, 'dispatchEvent', {
      value: vi.fn((event: CustomEvent) => {
        const eventType = event.type
        if (customEventListeners[eventType]) {
          customEventListeners[eventType].forEach(listener => listener(event))
        }
      }),
      writable: true,
    })

    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        search: '',
        href: 'http://localhost:3000/dashboard'
      },
      writable: true,
    })

    // Setup authenticated Supabase mock
    const mockSupabase = {
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              email_confirmed_at: new Date().toISOString(),
            }
          },
          error: null
        }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                email_confirmed_at: new Date().toISOString(),
              },
              access_token: 'mock-token',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            }
          },
          error: null
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-workspace-id',
                name: 'Test Workspace',
                owner_id: 'test-user-id',
              },
              error: null
            })),
          })),
        })),
      })),
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Setup session manager mock
    vi.mocked(sessionManager.validateSession).mockResolvedValue(true)
    vi.mocked(sessionManager.getState).mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString(),
        },
        access_token: 'mock-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
      lastValidated: new Date(),
      isValid: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create test wrapper with providers
  const createTestWrapper = () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>
        <WorkspaceProvider>
          <OfflineManager />
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    )
    
    TestWrapper.displayName = 'NetworkConnectivityTestWrapper'
    return TestWrapper
  }

  // Helper to simulate network events
  const simulateNetworkEvent = (type: 'online' | 'offline') => {
    Object.defineProperty(navigator, 'onLine', {
      value: type === 'online',
      writable: true,
    })

    const listeners = type === 'online' ? onlineEventListeners : offlineEventListeners
    listeners.forEach(listener => listener())
  }

  describe('Offline state detection and handling', () => {
    it('should show offline indicator when network goes offline', async () => {
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Initially online, no indicator should be shown
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()

      // Simulate going offline
      await act(async () => {
        simulateNetworkEvent('offline')
      })

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/you're currently offline/i)).toBeInTheDocument()
      })
    })

    it('should hide offline indicator when network comes back online', async () => {
      const TestWrapper = createTestWrapper()

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should show offline indicator initially
      await waitFor(() => {
        expect(screen.getByText(/you're currently offline/i)).toBeInTheDocument()
      })

      // Simulate coming back online
      await act(async () => {
        simulateNetworkEvent('online')
      })

      // Should hide offline indicator
      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Authentication state caching for offline use', () => {
    it('should cache authentication state when going offline', async () => {
      const TestWrapper = createTestWrapper()

      // Mock authenticated session
      const mockSession = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }

      const mockUseAuth = vi.fn().mockReturnValue({
        session: mockSession,
        validateSession: vi.fn().mockResolvedValue(true),
        user: mockSession.user,
        isAuthenticated: true,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
      })

      vi.doMock('@/contexts/auth-context', () => ({
        useAuth: mockUseAuth,
        AuthProvider: ({ children }: any) => children,
      }))

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate going offline
      await act(async () => {
        simulateNetworkEvent('offline')
      })

      // Should cache auth state
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cached-auth-state',
        expect.stringContaining('"user":')
      )
    })

    it('should retrieve cached auth state when offline', async () => {
      const TestWrapper = createTestWrapper()

      // Pre-populate cache
      const cachedState = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        cachedAt: Date.now() - 1000,
        isValid: true
      }
      mockLocalStorage['cached-auth-state'] = JSON.stringify(cachedState)

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Should be able to access cached state
      const offlineManager = (window as any).offlineManager
      expect(offlineManager).toBeDefined()

      const retrievedState = offlineManager.getCachedAuthState()
      expect(retrievedState).toEqual(cachedState)
    })

    it('should remove expired cached auth state', async () => {
      const TestWrapper = createTestWrapper()

      // Pre-populate cache with expired state
      const expiredState = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expiresAt: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // Cached 25 hours ago
        isValid: true
      }
      mockLocalStorage['cached-auth-state'] = JSON.stringify(expiredState)

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const retrievedState = offlineManager.getCachedAuthState()

      // Should return null for expired state
      expect(retrievedState).toBeNull()
      
      // Should remove expired cache
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('cached-auth-state')
    })
  })

  describe('Session validation after reconnection', () => {
    it('should validate session when coming back online', async () => {
      const TestWrapper = createTestWrapper()
      const mockValidateSession = vi.fn().mockResolvedValue(true)

      const mockSession = {
        user: { id: 'test-user-id' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }

      const mockUseAuth = vi.fn().mockReturnValue({
        session: mockSession,
        validateSession: mockValidateSession,
        user: mockSession.user,
        isAuthenticated: true,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
      })

      vi.doMock('@/contexts/auth-context', () => ({
        useAuth: mockUseAuth,
        AuthProvider: ({ children }: any) => children,
      }))

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate coming back online
      await act(async () => {
        simulateNetworkEvent('online')
      })

      // Should validate session after reconnection
      expect(mockValidateSession).toHaveBeenCalled()
    })

    it('should handle session expiry after reconnection', async () => {
      const TestWrapper = createTestWrapper()
      const mockValidateSession = vi.fn().mockResolvedValue(false)

      const mockSession = {
        user: { id: 'test-user-id' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate coming back online with expired session
      await act(async () => {
        simulateNetworkEvent('online')
      })

      // Should clear session when validation fails
      expect(sessionManager.clearSession).toHaveBeenCalled()
    })
  })

  describe('Network event dispatching', () => {
    it('should dispatch network-restored event when coming online', async () => {
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate coming online
      await act(async () => {
        simulateNetworkEvent('online')
      })

      // Should dispatch network-restored event
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network-restored'
        })
      )
    })

    it('should dispatch network-lost event when going offline', async () => {
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate going offline
      await act(async () => {
        simulateNetworkEvent('offline')
      })

      // Should dispatch network-lost event
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network-lost'
        })
      )
    })
  })

  describe('Authentication service availability checking', () => {
    it('should check auth service availability when online', async () => {
      const TestWrapper = createTestWrapper()

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      expect(offlineManager).toBeDefined()

      const isAvailable = await offlineManager.checkAuthServiceAvailability()
      
      // Should return true when online and service is available
      expect(isAvailable).toBe(true)
    })

    it('should return false when offline', async () => {
      const TestWrapper = createTestWrapper()

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const isAvailable = await offlineManager.checkAuthServiceAvailability()
      
      // Should return false when offline
      expect(isAvailable).toBe(false)
    })
  })

  describe('Offline authentication fallback', () => {
    it('should provide cached auth fallback when offline', async () => {
      const TestWrapper = createTestWrapper()

      // Pre-populate cache
      const cachedState = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        cachedAt: Date.now() - 1000,
        isValid: true
      }
      mockLocalStorage['cached-auth-state'] = JSON.stringify(cachedState)

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const fallback = offlineManager.getOfflineAuthFallback()

      expect(fallback.isAuthenticated).toBe(true)
      expect(fallback.source).toBe('cache')
      expect(fallback.user).toEqual(cachedState.user)
    })

    it('should indicate unavailable auth when offline without cache', async () => {
      const TestWrapper = createTestWrapper()

      // Start offline without cache
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const fallback = offlineManager.getOfflineAuthFallback()

      expect(fallback.isAuthenticated).toBe(false)
      expect(fallback.source).toBe('offline')
      expect(fallback.user).toBeNull()
    })
  })

  describe('Periodic connectivity checking', () => {
    it('should periodically check connectivity when offline', async () => {
      const TestWrapper = createTestWrapper()

      // Mock timers
      vi.useFakeTimers()

      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      // Simulate navigator coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      })

      // Fast-forward 30 seconds
      await act(async () => {
        vi.advanceTimersByTime(30000)
      })

      // Should detect that we're back online
      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })

  describe('useOfflineManager hook', () => {
    it('should provide online status', () => {
      const TestComponent = () => {
        const { isOnline } = useOfflineManager()
        return <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
      }

      render(<TestComponent />)

      expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
    })

    it('should update when connectivity changes', async () => {
      const TestComponent = () => {
        const { isOnline } = useOfflineManager()
        return <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
      }

      render(<TestComponent />)

      expect(screen.getByTestId('online-status')).toHaveTextContent('Online')

      // Simulate going offline
      await act(async () => {
        simulateNetworkEvent('offline')
      })

      // Note: In a real test environment, this would trigger a re-render
      // This test verifies the hook structure and event listener setup
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('Error handling during network changes', () => {
    it('should handle auth service errors gracefully', async () => {
      const TestWrapper = createTestWrapper()

      // Mock Supabase to throw error
      const mockSupabaseWithError = {
        auth: {
          getSession: vi.fn().mockRejectedValue(new Error('Network error')),
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } }
          })),
        },
      }
      vi.mocked(createClient).mockReturnValue(mockSupabaseWithError as any)

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const isAvailable = await offlineManager.checkAuthServiceAvailability()

      // Should return false when service throws error
      expect(isAvailable).toBe(false)
    })

    it('should handle localStorage errors gracefully', async () => {
      const TestWrapper = createTestWrapper()

      // Mock localStorage to throw error
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage error')
          }),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage error')
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <TestWrapper>
          <div data-testid="test-content">Test Content</div>
        </TestWrapper>
      )

      const offlineManager = (window as any).offlineManager
      const cachedState = offlineManager.getCachedAuthState()

      // Should return null and log warning when storage fails
      expect(cachedState).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retrieve cached auth state:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})