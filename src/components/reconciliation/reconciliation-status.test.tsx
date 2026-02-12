/**
 * ReconciliationStatus Component Tests
 * 
 * Tests the ReconciliationStatus component which displays per-account
 * reconciliation differences in the account list.
 * 
 * Requirements tested:
 * - 6.1: Display reconciliation difference for each account
 * - 6.2: Show difference amount in account's currency
 * - 6.3: Display "Reconciled" badge when difference is zero
 * - 6.4: Display difference amount with visual emphasis when non-zero
 * - 11.1: Provide quick "Add Transaction" action
 * - 11.2: Pre-select account when opening transaction form
 * - 11.3: Suggest transaction type based on difference direction
 * - 11.4: Show updated difference after transaction added
 * - 11.5: Display success message when difference reaches zero
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ReconciliationStatus, ReconciliationStatusSkeleton } from './reconciliation-status'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { AccountBalance } from '@/actions/balance-reconciliation'

// Mock the balance-reconciliation actions
vi.mock('@/actions/balance-reconciliation', () => ({
  getAccountDifference: vi.fn()
}))

// Mock the format utility
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: vi.fn((amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`
  })
}))

// Mock the QuickEntryForm component
vi.mock('@/components/transactions/quick-entry-form', () => ({
  QuickEntryForm: ({ accountId, suggestedType, onSuccess, onCancel }: any) => (
    <div data-testid="quick-entry-form">
      <div data-testid="form-account-id">Account ID: {accountId}</div>
      <div data-testid="form-suggested-type">Suggested Type: {suggestedType}</div>
      <button onClick={onSuccess} data-testid="form-submit">Submit</button>
      <button onClick={onCancel} data-testid="form-cancel">Cancel</button>
    </div>
  ),
}))

// Mock the Button component
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

describe('ReconciliationStatus', () => {
  const mockAccountId = 'test-account-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading skeleton while fetching data', () => {
      // Mock a pending promise
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockReturnValue(
        new Promise(() => {}) // Never resolves
      )

      render(<ReconciliationStatus accountId={mockAccountId} />)

      // Check for loading state
      expect(screen.getByRole('status', { name: /loading reconciliation status/i })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveClass('animate-pulse')
    })
  })

  describe('Reconciled State (Requirement 6.3)', () => {
    it('should display "Reconciled" badge when difference is zero', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1500,
        calculated_balance: 1500,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByRole('status', { name: /account reconciled/i })).toBeInTheDocument()
      })

      expect(screen.getByText('Reconciled')).toBeInTheDocument()
      // CheckCircle icon is present (SVG doesn't have img role)
      const badge = screen.getByRole('status', { name: /account reconciled/i })
      expect(badge.querySelector('svg')).toBeInTheDocument()
    })

    it('should display "Reconciled" badge when difference is very small (< 0.01)', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1500.005,
        calculated_balance: 1500,
        difference: 0.005,
        currency: 'UAH',
        is_reconciled: true // is_reconciled is true when |difference| < 0.01
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText('Reconciled')).toBeInTheDocument()
      })
    })

    it('should use success color for reconciled badge', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1500,
        calculated_balance: 1500,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status', { name: /account reconciled/i })
        expect(badge).toHaveClass('text-[var(--accent-success)]')
      })
    })
  })

  describe('Positive Difference State (Requirement 6.4)', () => {
    it('should display positive difference with success color', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1600,
        calculated_balance: 1500,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText('Difference')).toBeInTheDocument()
      })

      // Check for positive difference display
      const differenceAmount = screen.getByText(/\+UAH 100\.00/)
      expect(differenceAmount).toBeInTheDocument()
      expect(differenceAmount).toHaveClass('text-[var(--accent-success)]')
    })

    it('should format positive difference with plus sign (Requirement 6.2)', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1750.50,
        calculated_balance: 1500,
        difference: 250.50,
        currency: 'USD',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText(/\+USD 250\.50/)).toBeInTheDocument()
      })
    })
  })

  describe('Negative Difference State (Requirement 6.4)', () => {
    it('should display negative difference with error color', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1400,
        calculated_balance: 1500,
        difference: -100,
        currency: 'UAH',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText('Difference')).toBeInTheDocument()
      })

      // Check for negative difference display
      const differenceAmount = screen.getByText(/-UAH 100\.00/)
      expect(differenceAmount).toBeInTheDocument()
      expect(differenceAmount).toHaveClass('text-[var(--accent-error)]')
    })

    it('should format negative difference with minus sign (Requirement 6.2)', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1250.75,
        calculated_balance: 1500,
        difference: -249.25,
        currency: 'EUR',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText(/-EUR 249\.25/)).toBeInTheDocument()
      })
    })
  })

  describe('Currency Display (Requirement 6.2)', () => {
    it('should display difference in account native currency', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1600,
        calculated_balance: 1500,
        difference: 100,
        currency: 'GBP',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByText(/GBP/)).toBeInTheDocument()
      })
    })

    it('should handle different currencies correctly', async () => {
      const currencies = ['UAH', 'USD', 'EUR', 'GBP', 'PLN']
      
      for (const currency of currencies) {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency,
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        const { unmount } = render(<ReconciliationStatus accountId={mockAccountId} />)

        await waitFor(() => {
          expect(screen.getByText(new RegExp(currency))).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe('Error Handling', () => {
    it('should not display anything when fetch fails', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Failed to fetch account difference'
      })

      const { container } = render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should not display anything when account not found', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Account not found'
      })

      const { container } = render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should not display anything when authentication fails', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Authentication required'
      })

      const { container } = render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for loading state', () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockReturnValue(
        new Promise(() => {})
      )

      render(<ReconciliationStatus accountId={mockAccountId} />)

      expect(screen.getByRole('status', { name: /loading reconciliation status/i })).toBeInTheDocument()
    })

    it('should have proper ARIA labels for reconciled state', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1500,
        calculated_balance: 1500,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByRole('status', { name: /account reconciled/i })).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels for difference state', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1600,
        calculated_balance: 1500,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} />)

      await waitFor(() => {
        expect(screen.getByRole('status', { name: /reconciliation difference: \+UAH 100\.00/i })).toBeInTheDocument()
      })
    })
  })

  describe('Custom className', () => {
    it('should apply custom className to component', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: mockAccountId,
        opening_balance: 1000,
        current_balance: 1500,
        calculated_balance: 1500,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance
      })

      render(<ReconciliationStatus accountId={mockAccountId} className="custom-class" />)

      await waitFor(() => {
        const status = screen.getByRole('status')
        expect(status.parentElement).toHaveClass('custom-class')
      })
    })
  })

  describe('Add Transaction Quick Action (Requirements 11.1-11.5)', () => {
    describe('Requirement 11.1: Quick "Add Transaction" action', () => {
      it('should show "Add Transaction" button when showAddTransaction is true and difference exists', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })
      })

      it('should not show "Add Transaction" button when showAddTransaction is false', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={false} />)

        await waitFor(() => {
          expect(screen.queryByText(/Add Transaction/i)).not.toBeInTheDocument()
        })
      })

      it('should not show "Add Transaction" button when account is reconciled', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1500,
          calculated_balance: 1500,
          difference: 0,
          currency: 'UAH',
          is_reconciled: true
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.queryByText(/Add Transaction/i)).not.toBeInTheDocument()
        })
      })
    })

    describe('Requirement 11.2: Pre-select account in transaction form', () => {
      it('should pass accountId to QuickEntryForm when opened', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })

        // Click the Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        // Verify the form is shown with correct accountId
        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
          expect(screen.getByTestId('form-account-id')).toHaveTextContent(`Account ID: ${mockAccountId}`)
        })
      })
    })

    describe('Requirement 11.3: Suggest transaction type based on difference direction', () => {
      it('should suggest "income" type when difference is positive', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100, // Positive difference
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })

        // Click the Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        // Verify the form suggests income type
        await waitFor(() => {
          expect(screen.getByTestId('form-suggested-type')).toHaveTextContent('Suggested Type: income')
        })
      })

      it('should suggest "expense" type when difference is negative', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1400,
          calculated_balance: 1500,
          difference: -100, // Negative difference
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })

        // Click the Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        // Verify the form suggests expense type
        await waitFor(() => {
          expect(screen.getByTestId('form-suggested-type')).toHaveTextContent('Suggested Type: expense')
        })
      })
    })

    describe('Requirement 11.4: Show updated difference after transaction added', () => {
      it('should refetch account difference after transaction is submitted', async () => {
        const initialBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        const updatedBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1600,
          difference: 0,
          currency: 'UAH',
          is_reconciled: true
        }

        // First call returns initial balance
        vi.mocked(balanceReconciliationActions.getAccountDifference)
          .mockResolvedValueOnce({ data: initialBalance })
          .mockResolvedValueOnce({ data: updatedBalance })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/\+UAH 100\.00/)).toBeInTheDocument()
        })

        // Click Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
        })

        // Submit the form
        fireEvent.click(screen.getByTestId('form-submit'))

        // Verify the difference is updated
        await waitFor(() => {
          expect(screen.getByText('Reconciled')).toBeInTheDocument()
        })

        // Verify getAccountDifference was called twice
        expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(2)
      })

      it('should close the form after successful submission', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })

        // Click Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
        })

        // Submit the form
        fireEvent.click(screen.getByTestId('form-submit'))

        // Verify the form is closed
        await waitFor(() => {
          expect(screen.queryByTestId('quick-entry-form')).not.toBeInTheDocument()
        })
      })
    })

    describe('Requirement 11.5: Display success message when difference reaches zero', () => {
      it('should show success message when account becomes reconciled', async () => {
        const initialBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        const reconciledBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1600,
          difference: 0,
          currency: 'UAH',
          is_reconciled: true
        }

        // First call returns initial balance, second returns reconciled
        vi.mocked(balanceReconciliationActions.getAccountDifference)
          .mockResolvedValueOnce({ data: initialBalance })
          .mockResolvedValueOnce({ data: reconciledBalance })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/\+UAH 100\.00/)).toBeInTheDocument()
        })

        // Click Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
        })

        // Submit the form
        fireEvent.click(screen.getByTestId('form-submit'))

        // Verify success message is shown
        await waitFor(() => {
          expect(screen.getByText(/Reconciliation complete!/i)).toBeInTheDocument()
          expect(screen.getByText(/was \+UAH 100\.00/i)).toBeInTheDocument()
        })
      })

      it('should show success message with negative difference', async () => {
        const initialBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1400,
          calculated_balance: 1500,
          difference: -100,
          currency: 'EUR',
          is_reconciled: false
        }

        const reconciledBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1400,
          calculated_balance: 1400,
          difference: 0,
          currency: 'EUR',
          is_reconciled: true
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference)
          .mockResolvedValueOnce({ data: initialBalance })
          .mockResolvedValueOnce({ data: reconciledBalance })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/-EUR 100\.00/)).toBeInTheDocument()
        })

        // Click Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
        })

        // Submit the form
        fireEvent.click(screen.getByTestId('form-submit'))

        // Verify success message shows the previous negative difference
        // formatCurrency returns "EUR -100.00" for negative values
        await waitFor(() => {
          expect(screen.getByText(/Reconciliation complete!/i)).toBeInTheDocument()
          expect(screen.getByText(/was EUR -100\.00/i)).toBeInTheDocument()
        })
      })
    })

    describe('Form cancellation', () => {
      it('should close form when cancel button is clicked', async () => {
        const mockAccountBalance: AccountBalance = {
          account_id: mockAccountId,
          opening_balance: 1000,
          current_balance: 1600,
          calculated_balance: 1500,
          difference: 100,
          currency: 'UAH',
          is_reconciled: false
        }

        vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
          data: mockAccountBalance
        })

        render(<ReconciliationStatus accountId={mockAccountId} showAddTransaction={true} />)

        await waitFor(() => {
          expect(screen.getByText(/Add Transaction/i)).toBeInTheDocument()
        })

        // Click Add Transaction button
        fireEvent.click(screen.getByText(/Add Transaction/i))

        await waitFor(() => {
          expect(screen.getByTestId('quick-entry-form')).toBeInTheDocument()
        })

        // Click cancel button
        fireEvent.click(screen.getByTestId('form-cancel'))

        // Verify the form is closed
        await waitFor(() => {
          expect(screen.queryByTestId('quick-entry-form')).not.toBeInTheDocument()
        })
      })
    })
  })
})

describe('ReconciliationStatusSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<ReconciliationStatusSkeleton />)

    expect(screen.getByRole('status', { name: /loading reconciliation status/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('animate-pulse')
  })

  it('should apply custom className', () => {
    render(<ReconciliationStatusSkeleton className="custom-skeleton-class" />)

    const skeleton = screen.getByRole('status')
    expect(skeleton).toHaveClass('custom-skeleton-class')
  })
})
