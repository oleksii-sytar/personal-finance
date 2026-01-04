import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkspaceSettings } from '@/components/shared/workspace-settings'
import { AuthProvider } from '@/contexts/auth-context'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { ThemeProvider } from '@/contexts/theme-context'

// Mock the contexts with minimal required data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' }
}

const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  currency: 'UAH',
  created_at: '2024-01-01T00:00:00Z',
  owner_id: 'test-user-id'
}

const mockMembers = [
  {
    id: 'member-1',
    user_id: 'test-user-id',
    workspace_id: 'test-workspace-id',
    role: 'owner' as const,
    created_at: '2024-01-01T00:00:00Z',
    user_profile: {
      id: 'test-user-id',
      full_name: 'Test User',
      email: 'test@example.com'
    }
  }
]

// Mock the auth context
const mockAuthContext = {
  user: mockUser,
  loading: false,
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn()
}

// Mock the workspace context
const mockWorkspaceContext = {
  currentWorkspace: mockWorkspace,
  workspaces: [mockWorkspace],
  members: mockMembers,
  invitations: [], // Add empty invitations array
  loading: false,
  switchWorkspace: vi.fn(),
  refreshWorkspaces: vi.fn(),
  refreshMembers: vi.fn(),
  createWorkspace: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn()
}

// Mock the theme context
const mockThemeContext = {
  theme: 'system' as const,
  resolvedTheme: 'dark' as const,
  setTheme: vi.fn(),
  systemTheme: 'dark' as const
}

// Mock the contexts
vi.mock('@/contexts/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}))

vi.mock('@/contexts/workspace-context', () => ({
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
  useWorkspace: () => mockWorkspaceContext
}))

vi.mock('@/contexts/theme-context', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => mockThemeContext
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock matchMedia for system theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

describe('Settings Page Theme Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should display theme toggle in settings page', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    // Check that the Appearance section exists
    expect(screen.getByText('Appearance')).toBeInTheDocument()

    // Check that theme toggle is present
    expect(screen.getByRole('radiogroup', { name: /theme selection/i })).toBeInTheDocument()

    // Check that all theme options are available
    expect(screen.getByRole('radio', { name: /light.*day studio/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /dark.*night cockpit/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /system.*follow your operating system/i })).toBeInTheDocument()
  })

  it('should allow theme switching from settings page', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    // Find the light theme button
    const lightThemeButton = screen.getByRole('radio', { name: /light.*day studio/i })
    
    // Click the light theme button
    fireEvent.click(lightThemeButton)

    // Verify that setTheme was called with 'light'
    await waitFor(() => {
      expect(mockThemeContext.setTheme).toHaveBeenCalledWith('light')
    })
  })

  it('should show current theme selection in settings', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    // Check that the system theme button is marked as selected (from mockThemeContext)
    const systemThemeButton = screen.getByRole('radio', { name: /system.*follow your operating system/i })
    expect(systemThemeButton).toHaveAttribute('aria-checked', 'true')
  })

  it('should display system theme context when system is selected', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    // Since mockThemeContext has theme: 'system', check for system context
    expect(screen.getByText(/following system preference/i)).toBeInTheDocument()
    
    // Look for the specific "Dark" text in the system preference context
    const systemContext = screen.getByText(/following system preference/i).closest('div')
    expect(systemContext).toHaveTextContent('Dark')
  })

  it('should position theme toggle before workspace settings', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    const appearanceHeading = screen.getByText('Appearance')
    const workspaceHeading = screen.getByText('Workspace Settings')

    // Check that both sections exist
    expect(appearanceHeading).toBeInTheDocument()
    expect(workspaceHeading).toBeInTheDocument()

    // Get the container element and check order using textContent
    const container = appearanceHeading.closest('[class*="space-y"]')
    if (container) {
      const containerText = container.textContent || ''
      const appearanceIndex = containerText.indexOf('Appearance')
      const workspaceIndex = containerText.indexOf('Workspace Settings')
      
      expect(appearanceIndex).toBeLessThan(workspaceIndex)
    }
  })

  it('should maintain theme toggle accessibility in settings context', async () => {
    render(
      <TestWrapper>
        <WorkspaceSettings />
      </TestWrapper>
    )

    const themeToggle = screen.getByRole('radiogroup', { name: /theme selection/i })
    
    // Check accessibility attributes
    expect(themeToggle).toHaveAttribute('role', 'radiogroup')
    expect(themeToggle).toHaveAttribute('aria-label', 'Theme selection')

    // Check that each theme option has proper accessibility
    const themeOptions = screen.getAllByRole('radio')
    expect(themeOptions).toHaveLength(3)

    themeOptions.forEach(option => {
      expect(option).toHaveAttribute('aria-checked')
      expect(option).toHaveAttribute('aria-describedby')
    })
  })
})