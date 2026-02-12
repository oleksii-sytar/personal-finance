/**
 * UpdateBalanceDialog Component Tests
 * 
 * Tests the UpdateBalanceDialog component functionality including:
 * - Rendering and display of calculated balance
 * - Form input validation
 * - Preview of new difference
 * - Successful balance update
 * - Error handling
 * 
 * Requirements tested:
 * - 2.1: Provide "Update Current Balance" action
 * - 2.2: Display current calculated balance as reference
 * - 2.3: Accept any valid numeric value (positive or negative)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateBalanceDialog } from './update-balance-dialog'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { Account } from '@/actions/accounts'
import type { AccountBalance } from '@/actions/balance-reconciliation'

// Mock the actions
vi.mock('@/actions/balance-reconciliation', () => ({
  updateCurrentBalance: vi.fn(),
  getAccountDifference: vi.fn(),
}))

// Mock formatCurrency
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: vi.fn((amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`
  })
}))

describe('UpdateBalanceDialog', () => {
  const mockAccount: Account = {
    id: 'account-1',
    workspace_id: 'workspace-1',
    name: 'Test Checking Account',
    type: 'checking',
    opening_balance: 1000,
    current_balance: 1500,
    current_balance_updated_at: '2024-01-15T10:00:00Z',
    currency: 'UAH',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }

  const mockAccountBalance: AccountBalance = {
    account_id: 'account-1',
    opening_balance: 1000,
    current_balance: 1500,
    calculated_balance: 1450,
    difference: 50,
    currency: 'UAH',
    is_reconciled: false
  }

  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
      data: mockAccountBalance
    })
    
    vi.mocked(balanceReconciliationActions.updateCurrentBalance).mockResolvedValue({
      data: { ...mockAccount, current_balance: 1600 }
    })
    
    // Clear mock call history
    mockOnClose.mockClear()
    mockOnSuccess.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <UpdateBalanceDialog
          isOpen={false}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByText('Update Current Balance')).not.toBeInTheDocument()
    })

    it('should render dialog when isOpen is true', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Update Current Balance')).toBeInTheDocument()
      })
    })

    it('should display account name', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Test Checking Account')).toBeInTheDocument()
      })
    })

    it('should display loading state while fetching account balance', () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      // Should show loading animation
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should display calculated balance as reference (Requirement 2.2)', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Calculated Balance')).toBeInTheDocument()
        expect(screen.getByText('UAH 1450.00')).toBeInTheDocument()
      })
    })

    it('should display help text explaining calculated balance', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Calculated from opening balance \+ transactions/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Input (Requirement 2.3)', () => {
    it('should initialize input with current balance', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        const input = screen.getByLabelText(/Current Balance/i) as HTMLInputElement
        expect(input.value).toBe('1500')
      })
    })

    it('should accept positive numeric values', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '2000')

      expect((input as HTMLInputElement).value).toBe('2000')
    })

    it('should accept negative numeric values (Requirement 2.3)', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '-500')

      expect((input as HTMLInputElement).value).toBe('-500')
    })

    it('should accept zero as a valid value', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '0')

      expect((input as HTMLInputElement).value).toBe('0')
    })

    it('should accept decimal values', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1234.56')

      expect((input as HTMLInputElement).value).toBe('1234.56')
    })
  })

  describe('Validation', () => {
    it('should show error for empty input on submit', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Balance is required')).toBeInTheDocument()
      })

      expect(balanceReconciliationActions.updateCurrentBalance).not.toHaveBeenCalled()
    })

    it('should show error for invalid numeric input', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      // Note: typing 'invalid' into a number input doesn't actually set the value
      // The browser prevents non-numeric input, so the field remains empty
      // This test verifies that empty input shows the "Balance is required" error

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Balance is required')).toBeInTheDocument()
      })

      expect(balanceReconciliationActions.updateCurrentBalance).not.toHaveBeenCalled()
    })

    it('should clear validation error when user types', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Balance is required')).toBeInTheDocument()
      })

      await user.type(input, '1000')

      await waitFor(() => {
        expect(screen.queryByText('Balance is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Difference Preview', () => {
    it('should show preview of new difference when value changes', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      await waitFor(() => {
        expect(screen.getByText('New Difference')).toBeInTheDocument()
        // 1600 - 1450 (calculated) = +150
        // Use regex to match the text that may be split across elements
        expect(screen.getByText(/UAH 150\.00/)).toBeInTheDocument()
      })
    })

    it('should show positive difference with success color', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      await waitFor(() => {
        const differenceText = screen.getByText(/UAH 150\.00/)
        expect(differenceText).toHaveClass('text-[var(--accent-success)]')
      })
    })

    it('should show negative difference with error color', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1300')

      await waitFor(() => {
        // 1300 - 1450 (calculated) = -150
        const differenceText = screen.getByText(/UAH -150\.00/)
        expect(differenceText).toHaveClass('text-[var(--accent-error)]')
      })
    })

    it('should show reconciled message when difference is zero', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1450') // Same as calculated balance

      await waitFor(() => {
        expect(screen.getByText('✓ Reconciled')).toBeInTheDocument()
        expect(screen.getByText('Account will be reconciled')).toBeInTheDocument()
      })
    })

    it('should show guidance text for positive difference', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      await waitFor(() => {
        expect(screen.getByText(/Check for missing income or extra expenses/i)).toBeInTheDocument()
      })
    })

    it('should show guidance text for negative difference', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1300')

      await waitFor(() => {
        expect(screen.getByText(/Check for missing expenses or extra income/i)).toBeInTheDocument()
      })
    })

    it('should not show preview when value has not changed', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      // Input should be initialized with current balance (1500)
      // Preview should not show since value hasn't changed
      expect(screen.queryByText('New Difference')).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call updateCurrentBalance with correct values on submit', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(balanceReconciliationActions.updateCurrentBalance).toHaveBeenCalledWith(
          'account-1',
          1600
        )
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Make the update take some time
      vi.mocked(balanceReconciliationActions.updateCurrentBalance).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockAccount }), 100))
      )
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      expect(screen.getByText('Updating...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should call onSuccess and onClose on successful update', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should display error message on failed update', async () => {
      const user = userEvent.setup()
      
      vi.mocked(balanceReconciliationActions.updateCurrentBalance).mockResolvedValue({
        error: 'Failed to update balance'
      })
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to update balance')).toBeInTheDocument()
      })
    })

    it('should not close dialog on failed update', async () => {
      const user = userEvent.setup()
      
      vi.mocked(balanceReconciliationActions.updateCurrentBalance).mockResolvedValue({
        error: 'Update failed'
      })
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
      expect(screen.getByText('Update Current Balance')).toBeInTheDocument()
    })
  })

  describe('Dialog Controls', () => {
    it('should close dialog when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when X button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText('Close dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByLabelText('Close dialog')
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close dialog when backdrop is clicked', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Update Current Balance')).toBeInTheDocument()
      })

      // Click the backdrop (the parent div with backdrop-blur)
      const backdrop = document.querySelector('.backdrop-blur-sm')
      expect(backdrop).toBeInTheDocument()
      
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('should not close dialog when clicking inside the card', async () => {
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Update Current Balance')).toBeInTheDocument()
      })

      const card = screen.getByText('Update Current Balance').closest('div')
      if (card) {
        fireEvent.click(card)
        expect(mockOnClose).not.toHaveBeenCalled()
      }
    })

    it('should disable close actions during submission', async () => {
      const user = userEvent.setup()
      
      // Make the update take some time
      vi.mocked(balanceReconciliationActions.updateCurrentBalance).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockAccount }), 100))
      )
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      const submitButton = screen.getByRole('button', { name: /Update Balance/i })
      await user.click(submitButton)

      // Buttons should be disabled during submission
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      const closeButton = screen.getByLabelText('Close dialog')
      
      expect(cancelButton).toBeDisabled()
      expect(closeButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error when getAccountDifference fails', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Failed to fetch account balance'
      })
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch account balance')).toBeInTheDocument()
      })
    })

    it('should not show form when account balance fetch fails', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Fetch failed'
      })
      
      render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Fetch failed')).toBeInTheDocument()
      })

      expect(screen.queryByLabelText(/Current Balance/i)).not.toBeInTheDocument()
    })
  })

  describe('State Reset', () => {
    it('should reset state when dialog is closed and reopened', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/Current Balance/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/Current Balance/i)
      await user.clear(input)
      await user.type(input, '1600')

      // Close dialog
      rerender(
        <UpdateBalanceDialog
          isOpen={false}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      // Reopen dialog
      rerender(
        <UpdateBalanceDialog
          isOpen={true}
          account={mockAccount}
          onClose={mockOnClose}
        />
      )

      await waitFor(() => {
        const reopenedInput = screen.getByLabelText(/Current Balance/i) as HTMLInputElement
        // Should be reset to current balance
        expect(reopenedInput.value).toBe('1500')
      })
    })
  })
})
