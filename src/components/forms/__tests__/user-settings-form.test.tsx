import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserSettingsForm } from '../user-settings-form'
import { getUserSettings, updateUserSettings } from '@/actions/user-settings'
import { useWorkspace } from '@/contexts/workspace-context'
import { useToast } from '@/components/ui/toast'

// Mock dependencies
vi.mock('@/actions/user-settings')
vi.mock('@/contexts/workspace-context')
vi.mock('@/components/ui/toast')

const mockGetUserSettings = vi.mocked(getUserSettings)
const mockUpdateUserSettings = vi.mocked(updateUserSettings)
const mockUseWorkspace = vi.mocked(useWorkspace)
const mockUseToast = vi.mocked(useToast)

describe('UserSettingsForm', () => {
  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    currency: 'UAH',
    owner_id: 'user-1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      isLoading: false,
      setCurrentWorkspace: vi.fn(),
      refreshWorkspaces: vi.fn(),
    })
    mockUseToast.mockReturnValue(mockToast)
  })

  describe('Loading State', () => {
    it('shows loading skeleton while fetching settings', () => {
      mockGetUserSettings.mockImplementation(() => new Promise(() => {}))
      
      render(<UserSettingsForm />)
      
      // Should show loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Form Rendering', () => {
    it('renders all form fields with default values', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const balanceInput = screen.getByLabelText(/minimum safe balance/i) as HTMLInputElement
      const bufferInput = screen.getByLabelText(/safety buffer days/i) as HTMLInputElement
      
      expect(balanceInput.value).toBe('0')
      expect(bufferInput.value).toBe('7')
    })

    it('loads and displays existing settings', async () => {
      mockGetUserSettings.mockResolvedValue({
        data: {
          id: 'settings-1',
          user_id: 'user-1',
          workspace_id: 'workspace-1',
          minimum_safe_balance: 1000,
          safety_buffer_days: 14,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        const balanceInput = screen.getByLabelText(/minimum safe balance/i) as HTMLInputElement
        const bufferInput = screen.getByLabelText(/safety buffer days/i) as HTMLInputElement
        
        expect(balanceInput.value).toBe('1000')
        expect(bufferInput.value).toBe('14')
      })
    })

    it('shows current settings summary', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByText(/current settings/i)).toBeInTheDocument()
        expect(screen.getByText(/UAH 0.00/i)).toBeInTheDocument()
        // Check for the summary section specifically
        const summarySection = screen.getByText(/current settings/i).closest('div')
        expect(summarySection).toHaveTextContent('7')
        expect(summarySection).toHaveTextContent('days')
      })
    })
  })

  describe('Form Validation', () => {
    it('has HTML validation attributes for minimum safe balance', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const balanceInput = screen.getByLabelText(/minimum safe balance/i) as HTMLInputElement
      
      // Check HTML validation attributes
      expect(balanceInput).toHaveAttribute('type', 'number')
      expect(balanceInput).toHaveAttribute('min', '0')
      expect(balanceInput).toHaveAttribute('step', '0.01')
    })

    it('has HTML validation attributes for safety buffer days', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/safety buffer days/i)).toBeInTheDocument()
      })
      
      const bufferInput = screen.getByLabelText(/safety buffer days/i) as HTMLInputElement
      
      // Check HTML validation attributes
      expect(bufferInput).toHaveAttribute('type', 'number')
      expect(bufferInput).toHaveAttribute('min', '1')
      expect(bufferInput).toHaveAttribute('max', '30')
    })

    it('updates form state when values change', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const balanceInput = screen.getByLabelText(/minimum safe balance/i) as HTMLInputElement
      const bufferInput = screen.getByLabelText(/safety buffer days/i) as HTMLInputElement
      
      // Change values
      fireEvent.change(balanceInput, { target: { value: '500' } })
      fireEvent.change(bufferInput, { target: { value: '14' } })
      
      // Check values updated
      expect(balanceInput.value).toBe('500')
      expect(bufferInput.value).toBe('14')
      
      // Check summary updated
      await waitFor(() => {
        expect(screen.getByText(/UAH 500.00/i)).toBeInTheDocument()
        const summarySection = screen.getByText(/current settings/i).closest('div')
        expect(summarySection).toHaveTextContent('14')
      })
    })
  })

  describe('Form Submission', () => {
    it('submits valid form data successfully', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      mockUpdateUserSettings.mockResolvedValue({
        data: {
          id: 'settings-1',
          user_id: 'user-1',
          workspace_id: 'workspace-1',
          minimum_safe_balance: 500,
          safety_buffer_days: 10,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const balanceInput = screen.getByLabelText(/minimum safe balance/i)
      const bufferInput = screen.getByLabelText(/safety buffer days/i)
      const submitButton = screen.getByRole('button', { name: /save settings/i })
      
      fireEvent.change(balanceInput, { target: { value: '500' } })
      fireEvent.change(bufferInput, { target: { value: '10' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateUserSettings).toHaveBeenCalledWith(
          'workspace-1',
          expect.any(FormData)
        )
      })
      
      expect(mockToast.success).toHaveBeenCalledWith(
        'Settings saved',
        'Your forecast preferences have been updated successfully'
      )
    })

    it('handles server errors gracefully', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      mockUpdateUserSettings.mockResolvedValue({
        error: 'Failed to save settings',
      })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: /save settings/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'Failed to save settings',
          'Failed to save settings'
        )
      })
    })

    it('calls onSuccess callback after successful submission', async () => {
      const onSuccess = vi.fn()
      mockGetUserSettings.mockResolvedValue({ data: null })
      mockUpdateUserSettings.mockResolvedValue({
        data: {
          id: 'settings-1',
          user_id: 'user-1',
          workspace_id: 'workspace-1',
          minimum_safe_balance: 0,
          safety_buffer_days: 7,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      })
      
      render(<UserSettingsForm onSuccess={onSuccess} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: /save settings/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Cancel Button', () => {
    it('shows cancel button when onCancel prop provided', async () => {
      const onCancel = vi.fn()
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm onCancel={onCancel} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('calls onCancel when cancel button clicked', async () => {
      const onCancel = vi.fn()
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm onCancel={onCancel} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      
      expect(onCancel).toHaveBeenCalled()
    })

    it('does not show cancel button when onCancel not provided', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', async () => {
      mockGetUserSettings.mockResolvedValue({ data: null })
      
      render(<UserSettingsForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/minimum safe balance/i)).toBeInTheDocument()
      })
      
      const balanceInput = screen.getByLabelText(/minimum safe balance/i)
      const bufferInput = screen.getByLabelText(/safety buffer days/i)
      
      expect(balanceInput).toHaveAttribute('aria-describedby')
      expect(bufferInput).toHaveAttribute('aria-describedby')
    })
  })
})
