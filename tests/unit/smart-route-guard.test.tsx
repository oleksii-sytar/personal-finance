import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'

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

// Mock utils
vi.mock('@/lib/utils/return-url', () => ({
  createLoginUrlWithReturn: vi.fn()
}))

vi.mock('@/lib/navigation/history-manager', () => ({
  historyManager: {
    setReturnUrl: vi.fn()
  }
}))

const mockUseRouter = vi.mocked(await import('next/navigation')).useRouter
const mockUsePathname = vi.mocked(await import('next/navigation')).usePathname
const mockUseSearchParams = vi.mocked(await import('next/navigation')).useSearchParams
const mockUseAuth = vi.mocked(await import('@/contexts/auth-context')).useAuth
const mockUseWorkspace = vi.mocked(await import('@/contexts/workspace-context')).useWorkspace
const mockCreateLoginUrlWithReturn = vi.mocked(await import('@/lib/utils/return-url')).createLoginUrlWithReturn

describe('SmartRouteGuard', () => {
  const mockPush = vi.fn()
  const mockSearchParams = {
    toString: vi.fn()
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
    mockSearchParams.toString.mockReturnValue('')
    
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
      members: [],
      loading: false,
      invitations: [],
      workspaces: []
    })
    
    mockCreateLoginUrlWithReturn.mockReturnValue('/auth/login?returnUrl=%2Fdashboard')
  })

  it('renders children when authenticated and requirements met', () => {
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
    
    render(
      <SmartRouteGuard>
        <div>Protected Content</div>
      </SmartRouteGuard>
    )
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows loading when auth is loading', () => {
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
    
    render(
      <SmartRouteGuard>
        <div>Protected Content</div>
      </SmartRouteGuard>
    )
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to login when not authenticated', async () => {
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
    
    render(
      <SmartRouteGuard requireAuth={true}>
        <div>Protected Content</div>
      </SmartRouteGuard>
    )
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/auth/login?returnUrl=%2Fdashboard')
  })

  it('redirects to email verification when email not verified', async () => {
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
    
    render(
      <SmartRouteGuard requireEmailVerification={true}>
        <div>Protected Content</div>
      </SmartRouteGuard>
    )
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
  })

  it('redirects to workspace creation when workspace required but missing', async () => {
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
      members: [],
      loading: false,
      invitations: [],
      workspaces: []
    })
    
    render(
      <SmartRouteGuard requireWorkspace={true}>
        <div>Protected Content</div>
      </SmartRouteGuard>
    )
    
    // Wait for effects to run
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockPush).toHaveBeenCalledWith('/onboarding/workspace')
  })

  it('shows access denied for insufficient role', () => {
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
      members: [{ user_id: '1', role: 'member' }],
      loading: false,
      invitations: [],
      workspaces: []
    } as any)
    
    render(
      <SmartRouteGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </SmartRouteGuard>
    )
    
    expect(screen.getByText('Access denied. Insufficient permissions.')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders children when role requirements are met', () => {
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
      members: [{ user_id: '1', role: 'admin' }],
      loading: false,
      invitations: [],
      workspaces: []
    } as any)
    
    render(
      <SmartRouteGuard allowedRoles={['admin']}>
        <div>Admin Content</div>
      </SmartRouteGuard>
    )
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('uses custom fallback component', () => {
    const CustomFallback = () => <div>Custom Access Denied</div>
    
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
      members: [{ user_id: '1', role: 'member' }],
      loading: false,
      invitations: [],
      workspaces: []
    } as any)
    
    render(
      <SmartRouteGuard allowedRoles={['admin']} fallbackComponent={CustomFallback}>
        <div>Admin Content</div>
      </SmartRouteGuard>
    )
    
    expect(screen.getByText('Custom Access Denied')).toBeInTheDocument()
  })
})