import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthSyncManager } from '@/components/shared/auth-sync-manager'

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

// Mock return URL utility
vi.mock('@/lib/utils/return-url', () => ({
  createLoginUrlWithReturn: vi.fn()
}))

const mockUseAuth = vi.mocked(await import('@/contexts/auth-context')).useAuth
const mockSessionManager = vi.mocked(await import('@/lib/session/session-manager')).sessionManager
const mockCreateLoginUrlWithReturn = vi.mocked(await import('@/lib/utils/return-url')).createLoginUrlWithReturn

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock sessionStorage
const sessionStorageMock = {
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

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
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

describe('AuthSyncManager', () => {
  const mockSignOut = vi.fn()
  const mockValidateSession = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: false,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders without crashing', () => {
    render(<AuthSyncManager />)
    // AuthSyncManager doesn't render visible content
    expect(true).toBe(true)
  })

  it('sets up storage event listener on mount', () => {
    render(<AuthSyncManager />)
    
    expect(mockAddEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('current-tab-id', expect.any(String))
  })

  it('sets up visibility change listener on mount', () => {
    render(<AuthSyncManager />)
    
    expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })

  it('sets up beforeunload listener on mount', () => {
    render(<AuthSyncManager />)
    
    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('broadcasts sign in when user changes to authenticated', () => {
    const { rerender } = render(<AuthSyncManager />)
    
    // Initially no user
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
    
    // User signs in
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      session: { user: { id: '1' } },
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    rerender(<AuthSyncManager />)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'auth-state-change',
      expect.stringContaining('"type":"SIGN_IN"')
    )
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-state-change')
  })

  it('broadcasts sign out when user changes to null', () => {
    // Start with authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      session: { user: { id: '1' } },
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    const { rerender } = render(<AuthSyncManager />)
    
    // User signs out
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: false,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn()
    })
    
    rerender(<AuthSyncManager />)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'auth-state-change',
      expect.stringContaining('"type":"SIGN_OUT"')
    )
  })

  it('handles session expiry correctly', () => {
    render(<AuthSyncManager />)
    
    // Get the storage event handler
    const storageHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'storage'
    )?.[1]
    
    expect(storageHandler).toBeDefined()
    
    // Simulate session expiry event from another tab
    const mockEvent = {
      key: 'auth-state-change',
      newValue: JSON.stringify({
        type: 'SESSION_EXPIRED',
        timestamp: Date.now(),
        tabId: 'other-tab'
      })
    }
    
    sessionStorageMock.getItem.mockReturnValue('current-tab')
    
    storageHandler(mockEvent)
    
    expect(mockSessionManager.clearSession).toHaveBeenCalled()
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth-session-expired'
      })
    )
  })

  it('handles sign out event from another tab', () => {
    render(<AuthSyncManager />)
    
    // Get the storage event handler
    const storageHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'storage'
    )?.[1]
    
    expect(storageHandler).toBeDefined()
    
    // Simulate sign out event from another tab
    const mockEvent = {
      key: 'auth-state-change',
      newValue: JSON.stringify({
        type: 'SIGN_OUT',
        timestamp: Date.now(),
        tabId: 'other-tab'
      })
    }
    
    sessionStorageMock.getItem.mockReturnValue('current-tab')
    
    storageHandler(mockEvent)
    
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('validates session when tab becomes visible', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      session: { user: { id: '1' } },
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    mockValidateSession.mockResolvedValue(true)
    
    render(<AuthSyncManager />)
    
    // Get the visibility change handler
    const visibilityHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1]
    
    expect(visibilityHandler).toBeDefined()
    
    // Mock document.hidden to simulate tab becoming visible
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true
    })
    
    await visibilityHandler()
    
    expect(mockValidateSession).toHaveBeenCalled()
  })

  it('handles session validation failure on tab focus', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      session: { user: { id: '1' } },
      signOut: mockSignOut,
      validateSession: mockValidateSession,
      isAuthenticated: true,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      resetPassword: vi.fn()
    } as any)
    
    mockValidateSession.mockResolvedValue(false)
    
    render(<AuthSyncManager />)
    
    // Get the visibility change handler
    const visibilityHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1]
    
    expect(visibilityHandler).toBeDefined()
    
    // Mock document.hidden to simulate tab becoming visible
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true
    })
    
    await visibilityHandler()
    
    expect(mockValidateSession).toHaveBeenCalled()
    expect(mockSessionManager.clearSession).toHaveBeenCalled()
  })

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<AuthSyncManager />)
    
    unmount()
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('ignores messages from same tab', () => {
    render(<AuthSyncManager />)
    
    const tabId = 'current-tab'
    sessionStorageMock.getItem.mockReturnValue(tabId)
    
    // Get the storage event handler
    const storageHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'storage'
    )?.[1]
    
    // Simulate event from same tab
    const mockEvent = {
      key: 'auth-state-change',
      newValue: JSON.stringify({
        type: 'SIGN_OUT',
        timestamp: Date.now(),
        tabId: tabId
      })
    }
    
    storageHandler(mockEvent)
    
    // Should not trigger sign out since it's from the same tab
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})