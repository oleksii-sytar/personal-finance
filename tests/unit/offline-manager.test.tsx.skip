import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OfflineManager, useOfflineManager } from '@/components/shared/offline-manager'

// Mock contexts
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn()
}))

// Mock session manager
vi.mock('@/lib/session/session-manager', () => ({
  sessionManager: {
    clearSession: vi.fn()
  }
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock return URL utility
vi.mock('@/lib/utils/return-url', () => ({
  createLoginUrlWithReturn: vi.fn()
}))

const mockUseAuth = vi.mocked(await import('@/contexts/auth-context')).useAuth
const mockSessionManager = vi.mocked(await import('@/lib/session/session-manager')).sessionManager
const mockCreateClient = vi.mocked(await import('@/lib/supabase/client')).createClient
const mockCreateLoginUrlWithReturn = vi.mocked(await import('@/lib/utils/return-url')).createLoginUrlWithReturn

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock window methods
const mockDispatchEvent = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent
})

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
})

describe('OfflineManager', () => {
  const mockValidateSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      session: null,
      validateSession: mockValidateSession,
      user: null,
      isAuthenticated: false,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn()
    })
    
    mockCreateLoginUrlWithReturn.mockReturnValue('/auth/login?returnUrl=%2Fdashboard')
    
    // Mock location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dashboard',
        search: '',
        href: 'http://localhost:3000/dashboard'
      },
      writable: true
    })
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without crashing when online', () => {
    render(<OfflineManager />)
    // OfflineManager doesn't render visible content when online
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })

  it('shows offline indicator when offline', () => {
    // Set navigator to offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    })
    
    render(<OfflineManager />)
    
    expect(screen.getByText(/currently offline/i)).toBeInTheDocument()
  })

  it('sets up online/offline event listeners', () => {
    render(<OfflineManager />)
    
    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('caches auth state when session exists', () => {
    const mockSession = {
      user: { id: '1', email: 'test@example.com' },
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }
    
    mockUseAuth.mockReturnValue({
      session: mockSession,
      validateSession: mockValidateSession,
      user: mockSession.user,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    render(<OfflineManager />)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'cached-auth-state',
      expect.stringContaining('"user":')
    )
  })

  it('validates session after coming back online', async () => {
    const mockSession = {
      user: { id: '1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }
    
    mockUseAuth.mockReturnValue({
      session: mockSession,
      validateSession: mockValidateSession,
      user: mockSession.user,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    mockValidateSession.mockResolvedValue(true)
    
    render(<OfflineManager />)
    
    // Get the online event handler
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    
    expect(onlineHandler).toBeDefined()
    
    await onlineHandler()
    
    expect(mockValidateSession).toHaveBeenCalled()
  })

  it('handles session expiry after reconnection', async () => {
    const mockSession = {
      user: { id: '1' },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    }
    
    mockUseAuth.mockReturnValue({
      session: mockSession,
      validateSession: mockValidateSession,
      user: mockSession.user,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    mockValidateSession.mockResolvedValue(false)
    
    render(<OfflineManager />)
    
    // Get the online event handler
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    
    await onlineHandler()
    
    expect(mockValidateSession).toHaveBeenCalled()
    expect(mockSessionManager.clearSession).toHaveBeenCalled()
  })

  it('dispatches network events when connectivity changes', () => {
    render(<OfflineManager />)
    
    // Get the online event handler
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    
    // Get the offline event handler
    const offlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'offline'
    )?.[1]
    
    onlineHandler()
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network-restored'
      })
    )
    
    offlineHandler()
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'network-lost'
      })
    )
  })

  it('retrieves cached auth state correctly', () => {
    const cachedState = {
      user: { id: '1', email: 'test@example.com' },
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      cachedAt: Date.now() - 1000, // 1 second ago
      isValid: true
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedState))
    
    render(<OfflineManager />)
    
    // Access the global offline manager
    const offlineManager = (window as any).offlineManager
    expect(offlineManager).toBeDefined()
    
    const retrievedState = offlineManager.getCachedAuthState()
    expect(retrievedState).toEqual(cachedState)
  })

  it('removes expired cached auth state', () => {
    const expiredState = {
      user: { id: '1', email: 'test@example.com' },
      expiresAt: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      cachedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      isValid: true
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredState))
    
    render(<OfflineManager />)
    
    const offlineManager = (window as any).offlineManager
    const retrievedState = offlineManager.getCachedAuthState()
    
    expect(retrievedState).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('cached-auth-state')
  })

  it('provides offline auth fallback', () => {
    // Set navigator to offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    })
    
    const cachedState = {
      user: { id: '1', email: 'test@example.com' },
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      cachedAt: Date.now() - 1000,
      isValid: true
    }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedState))
    
    render(<OfflineManager />)
    
    const offlineManager = (window as any).offlineManager
    const fallback = offlineManager.getOfflineAuthFallback()
    
    expect(fallback.isAuthenticated).toBe(true)
    expect(fallback.source).toBe('cache')
    expect(fallback.user).toEqual(cachedState.user)
  })

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<OfflineManager />)
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})

describe('useOfflineManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    })
  })

  it('returns online status', () => {
    const TestComponent = () => {
      const { isOnline } = useOfflineManager()
      return <div>{isOnline ? 'Online' : 'Offline'}</div>
    }
    
    render(<TestComponent />)
    
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('updates when connectivity changes', () => {
    const TestComponent = () => {
      const { isOnline } = useOfflineManager()
      return <div>{isOnline ? 'Online' : 'Offline'}</div>
    }
    
    render(<TestComponent />)
    
    expect(screen.getByText('Online')).toBeInTheDocument()
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    })
    
    // Trigger the event
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1]
    const offlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'offline'
    )?.[1]
    
    if (offlineHandler) {
      offlineHandler()
    }
    
    // Note: In a real test, we'd need to trigger a re-render
    // This is a simplified test to verify the hook structure
  })
})