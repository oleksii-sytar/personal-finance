import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AccountRequirementGate } from '@/components/shared/account-requirement-gate'
import * as WorkspaceContext from '@/contexts/workspace-context'
import * as AccountsActions from '@/actions/accounts'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock contexts
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: vi.fn(),
}))

// Mock actions
vi.mock('@/actions/accounts', () => ({
  getAccounts: vi.fn(),
}))

describe('AccountRequirementGate', () => {
  const mockUseWorkspace = vi.mocked(WorkspaceContext.useWorkspace)
  const mockGetAccounts = vi.mocked(AccountsActions.getAccounts)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state while checking workspace and accounts', () => {
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      loading: true,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    const { container } = render(
      <AccountRequirementGate
        featureName="Test Feature"
        description="Test description"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    // Check for loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows children when workspace and accounts exist', async () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      currency: 'UAH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockAccounts = [
      {
        id: 'account-1',
        workspace_id: 'workspace-1',
        name: 'Main Account',
        type: 'checking' as const,
        opening_balance: 1000,
        current_balance: 1000,
        current_balance_updated_at: new Date().toISOString(),
        currency: 'UAH',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      loading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    mockGetAccounts.mockResolvedValue({ data: mockAccounts })

    render(
      <AccountRequirementGate
        featureName="Test Feature"
        description="Test description"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('shows account creation notice when workspace exists but no accounts', async () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      currency: 'UAH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      loading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    mockGetAccounts.mockResolvedValue({ data: [] })

    render(
      <AccountRequirementGate
        featureName="Transaction Management"
        description="Track your transactions"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Create Your First Account')).toBeInTheDocument()
    })

    expect(screen.getByText(/Before you can track transactions/)).toBeInTheDocument()
    expect(screen.getByText('Create First Account')).toBeInTheDocument()
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows helpful information about why accounts matter', async () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      currency: 'UAH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      loading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    mockGetAccounts.mockResolvedValue({ data: [] })

    render(
      <AccountRequirementGate
        featureName="Transaction Management"
        description="Track your transactions"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Why accounts matter:')).toBeInTheDocument()
    })

    expect(screen.getByText(/Track balances across multiple accounts/)).toBeInTheDocument()
    expect(screen.getByText(/See where your money is/)).toBeInTheDocument()
    expect(screen.getByText(/Reconcile accounts to ensure accuracy/)).toBeInTheDocument()
  })

  it('shows error message when account fetching fails', async () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      currency: 'UAH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      loading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    mockGetAccounts.mockResolvedValue({ error: 'Failed to load accounts' })

    render(
      <AccountRequirementGate
        featureName="Transaction Management"
        description="Track your transactions"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load accounts')).toBeInTheDocument()
    })
  })

  it('shows helpful tip about starting with main account', async () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      currency: 'UAH',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      loading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    mockGetAccounts.mockResolvedValue({ data: [] })

    render(
      <AccountRequirementGate
        featureName="Transaction Management"
        description="Track your transactions"
      >
        <div>Protected Content</div>
      </AccountRequirementGate>
    )

    await waitFor(() => {
      expect(screen.getByText(/Start with your main checking account/)).toBeInTheDocument()
    })
  })
})
