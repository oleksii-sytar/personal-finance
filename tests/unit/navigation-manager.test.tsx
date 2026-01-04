import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NavigationManager } from '@/components/shared/navigation-manager'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn()
}))

// Mock contexts
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn()
}))

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: vi.fn()
}))

vi.mock('@/hooks/use-post-login-check', () => ({
  usePostLoginCheck: vi.fn()
}))

const mockUseRouter = vi.mocked(await import('next/navigation')).useRouter
const mockUsePathname = vi.mocked(await import('next/navigation')).usePathname
const mockUseSearchParams = vi.mocked(await import('next/navigation')).useSearchParams
const mockUseAuth = vi.mocked(await import('@/contexts/auth-context')).useAuth
const mockUseWorkspace = vi.mocked(await import('@/contexts/workspace-context')).useWorkspace
const mockUsePostLoginCheck = vi.mocked(await import('@/hooks/use-post-login-check')).usePostLoginCheck

describe('NavigationManager', () => {
  const mockPush = vi.fn()
  const mockSearchParams = {
    get: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    })
    
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseSearchParams.mockReturnValue(mockSearchParams as any)
    
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      session: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    })
    
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: null,
      invitations: [],
      loading: false,
      members: [],
      workspaces: []
    })
    
    mockUsePostLoginCheck.mockReturnValue({
      hasPendingInvitations: false,
      pendingInvitations: [],
      checkComplete: true
    })
    
    mockSearchParams.get.mockReturnValue(null)
  })

  it('renders without crashing', () => {
    render(<NavigationManager />)
    // NavigationManager doesn't render visible content
    expect(true).toBe(true)
  })

  it('redirects first-time user to email verification', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email_confirmed_at: null },
      isAuthenticated: true,
      loading: false,
      session: { user: { id: '1' } },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    } as any)
    
    mockUsePathname.mockReturnValue('/dashboard')
    
    render(<NavigationManager />)
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
  })

  it('redirects user without workspace to onboarding', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email_confirmed_at: '2024-01-01' },
      isAuthenticated: true,
      loading: false,
      session: { user: { id: '1' } },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    } as any)
    
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: null,
      invitations: [],
      loading: false,
      members: [],
      workspaces: []
    })
    
    mockUsePathname.mockReturnValue('/dashboard')
    
    render(<NavigationManager />)
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
  })

  it('redirects user with pending invitations', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email_confirmed_at: '2024-01-01' },
      isAuthenticated: true,
      loading: false,
      session: { user: { id: '1' } },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    } as any)
    
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: { id: '1', name: 'Test' },
      invitations: [{ id: '1', workspace_id: '2' }],
      loading: false,
      members: [],
      workspaces: []
    } as any)
    
    mockUsePathname.mockReturnValue('/dashboard')
    
    render(<NavigationManager />)
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/auth/accept-invitations')
  })

  it('does not redirect when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
      session: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    })
    
    render(<NavigationManager />)
    
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      session: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    })
    
    render(<NavigationManager />)
    
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('respects return URL when all requirements are met', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email_confirmed_at: '2024-01-01' },
      isAuthenticated: true,
      loading: false,
      session: { user: { id: '1' } },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      validateSession: vi.fn()
    } as any)
    
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: { id: '1', name: 'Test' },
      invitations: [],
      loading: false,
      members: [],
      workspaces: []
    } as any)
    
    mockSearchParams.get.mockReturnValue('/settings')
    mockUsePathname.mockReturnValue('/dashboard')
    
    render(<NavigationManager />)
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/settings')
  })
})