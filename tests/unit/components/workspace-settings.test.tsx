import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkspaceSettings } from '@/components/shared/workspace-settings'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'

// Mock the contexts
vi.mock('@/contexts/auth-context')
vi.mock('@/contexts/workspace-context')

// Mock child components
vi.mock('@/components/shared/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>
}))

vi.mock('@/components/shared/member-management', () => ({
  MemberManagement: () => <div data-testid="member-management">Member Management</div>
}))

describe('WorkspaceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirements 2.2.6: Settings always accessible', () => {
    it('should show theme settings when user is authenticated but no workspace exists', () => {
      // Mock authenticated user without workspace
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        signOut: vi.fn()
      } as any)

      vi.mocked(useWorkspace).mockReturnValue({
        currentWorkspace: null,
        members: [],
        isLoading: false,
        refreshWorkspace: vi.fn()
      } as any)

      render(<WorkspaceSettings />)

      // Theme settings should be visible
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()

      // Workspace settings should show creation prompt
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument()
      expect(screen.getByText(/You need to create a workspace/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Workspace/i })).toBeInTheDocument()

      // Member management should NOT be visible
      expect(screen.queryByTestId('member-management')).not.toBeInTheDocument()
    })

    it('should show all settings when user has workspace', () => {
      // Mock authenticated user with workspace
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        signOut: vi.fn()
      } as any)

      vi.mocked(useWorkspace).mockReturnValue({
        currentWorkspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          currency: 'UAH',
          created_at: '2024-01-01T00:00:00Z'
        },
        members: [
          {
            id: 'member-1',
            user_id: 'user-1',
            workspace_id: 'workspace-1',
            role: 'owner',
            email: 'test@example.com'
          }
        ],
        isLoading: false,
        refreshWorkspace: vi.fn()
      } as any)

      render(<WorkspaceSettings />)

      // Theme settings should be visible
      expect(screen.getByText('Appearance')).toBeInTheDocument()
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()

      // Workspace settings should show actual workspace info
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument()
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
      expect(screen.getByText('UAH')).toBeInTheDocument()

      // Member management should be visible
      expect(screen.getByTestId('member-management')).toBeInTheDocument()
    })

    it('should show login prompt when user is not authenticated', () => {
      // Mock unauthenticated state
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        signOut: vi.fn()
      } as any)

      vi.mocked(useWorkspace).mockReturnValue({
        currentWorkspace: null,
        members: [],
        isLoading: false,
        refreshWorkspace: vi.fn()
      } as any)

      render(<WorkspaceSettings />)

      // Should show login prompt
      expect(screen.getByText(/Please log in to access settings/i)).toBeInTheDocument()

      // Theme settings should NOT be visible
      expect(screen.queryByText('Appearance')).not.toBeInTheDocument()
    })
  })

  describe('Access control', () => {
    it('should show Edit button only for workspace owners', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        signOut: vi.fn()
      } as any)

      vi.mocked(useWorkspace).mockReturnValue({
        currentWorkspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          currency: 'UAH',
          created_at: '2024-01-01T00:00:00Z'
        },
        members: [
          {
            id: 'member-1',
            user_id: 'user-1',
            workspace_id: 'workspace-1',
            role: 'owner',
            email: 'test@example.com'
          }
        ],
        isLoading: false,
        refreshWorkspace: vi.fn()
      } as any)

      render(<WorkspaceSettings />)

      // Edit button should be visible for owner
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument()
    })

    it('should NOT show Edit button for workspace members', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isLoading: false,
        signOut: vi.fn()
      } as any)

      vi.mocked(useWorkspace).mockReturnValue({
        currentWorkspace: {
          id: 'workspace-1',
          name: 'Test Workspace',
          currency: 'UAH',
          created_at: '2024-01-01T00:00:00Z'
        },
        members: [
          {
            id: 'member-1',
            user_id: 'user-1',
            workspace_id: 'workspace-1',
            role: 'member', // Not owner
            email: 'test@example.com'
          }
        ],
        isLoading: false,
        refreshWorkspace: vi.fn()
      } as any)

      render(<WorkspaceSettings />)

      // Edit button should NOT be visible for member
      expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument()
    })
  })
})
