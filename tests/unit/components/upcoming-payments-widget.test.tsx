/**
 * Unit Tests for UpcomingPaymentsWidget Component
 * 
 * Tests the display and interaction of the upcoming payments widget,
 * including risk indicators, mark as paid functionality, and various states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpcomingPaymentsWidget } from '@/components/forecast/upcoming-payments-widget'
import type { PaymentRisk } from '@/lib/calculations/payment-risk-assessment'

// Mock the MarkAsPaidButton component
vi.mock('@/components/transactions/mark-as-paid-button', () => ({
  MarkAsPaidButton: ({ transactionId, onMarkAsPaid, disabled }: any) => (
    <button
      data-testid={`mark-paid-${transactionId}`}
      onClick={() => onMarkAsPaid?.(transactionId)}
      disabled={disabled}
    >
      Mark as Paid
    </button>
  ),
}))

// Helper function to create mock payment risks
function createMockPaymentRisk(
  overrides: Partial<PaymentRisk> = {}
): PaymentRisk {
  return {
    transaction: {
      id: 'tx-1',
      amount: 1000,
      description: 'Test Payment',
      type: 'expense',
      status: 'planned',
      transaction_date: new Date('2026-02-15'),
      planned_date: new Date('2026-02-15'),
    },
    daysUntil: 5,
    projectedBalanceAtDate: 5000,
    balanceAfterPayment: 4000,
    riskLevel: 'safe',
    recommendation: 'Sufficient funds available.',
    canAfford: true,
    ...overrides,
  }
}

describe('UpcomingPaymentsWidget', () => {
  const defaultProps = {
    paymentRisks: [],
    currency: 'UAH',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('shows empty state when no payments', () => {
      render(<UpcomingPaymentsWidget {...defaultProps} />)

      expect(screen.getByText('No upcoming payments scheduled')).toBeInTheDocument()
      expect(screen.getByText('Add planned transactions to see them here')).toBeInTheDocument()
    })

    it('shows calendar icon in empty state', () => {
      const { container } = render(<UpcomingPaymentsWidget {...defaultProps} />)

      // Check for calendar SVG icon
      const calendarIcon = container.querySelector('svg.lucide-calendar')
      expect(calendarIcon).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading skeleton when isLoading is true', () => {
      render(<UpcomingPaymentsWidget {...defaultProps} isLoading={true} />)

      // Should show skeleton loaders
      const skeletons = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-pulse')
      )
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not show payment list when loading', () => {
      const paymentRisks = [createMockPaymentRisk()]
      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          paymentRisks={paymentRisks}
          isLoading={true}
        />
      )

      expect(screen.queryByText('Test Payment')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          error="Failed to load payments"
        />
      )

      expect(screen.getByText(/Failed to load payments/)).toBeInTheDocument()
    })

    it('does not show payment list when error exists', () => {
      const paymentRisks = [createMockPaymentRisk()]
      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          paymentRisks={paymentRisks}
          error="Error occurred"
        />
      )

      expect(screen.queryByText('Test Payment')).not.toBeInTheDocument()
    })
  })

  describe('Summary Totals', () => {
    it('calculates and displays 7-day total correctly', () => {
      const paymentRisks = [
        createMockPaymentRisk({ 
          daysUntil: 3, 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-1',
            amount: 500 
          } 
        }),
        createMockPaymentRisk({ 
          daysUntil: 5, 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-2',
            amount: 300 
          } 
        }),
        createMockPaymentRisk({ 
          daysUntil: 10, 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-3',
            amount: 200 
          } 
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      // 7-day total should be 500 + 300 = 800 (excludes 10-day payment)
      expect(screen.getByText('Next 7 Days')).toBeInTheDocument()
      expect(screen.getByText(/800,00 ₴/)).toBeInTheDocument()
    })

    it('calculates and displays 30-day total correctly', () => {
      const paymentRisks = [
        createMockPaymentRisk({ 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-1',
            amount: 500 
          } 
        }),
        createMockPaymentRisk({ 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-2',
            amount: 300 
          } 
        }),
        createMockPaymentRisk({ 
          transaction: { 
            ...createMockPaymentRisk().transaction, 
            id: 'tx-3',
            amount: 200 
          } 
        }),
      ]

      const { container } = render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      // 30-day total should be 500 + 300 + 200 = 1000
      expect(screen.getByText('Next 30 Days')).toBeInTheDocument()
      
      // Find the 30-day total specifically (second column)
      const summaryGrid = container.querySelector('.grid.grid-cols-2')
      const thirtyDayColumn = summaryGrid?.children[1]
      expect(thirtyDayColumn?.textContent).toMatch(/Next 30 Days1\s000,00\s₴/)
    })

    it('shows zero totals when no payments', () => {
      render(<UpcomingPaymentsWidget {...defaultProps} />)

      // Both 7-day and 30-day should show 0
      const zeroAmounts = screen.getAllByText(/0,00 ₴/)
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Risk Indicators', () => {
    it('shows high-risk count badge when danger payments exist', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'danger' }),
        createMockPaymentRisk({ riskLevel: 'danger' }),
        createMockPaymentRisk({ riskLevel: 'safe' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('2 at risk')).toBeInTheDocument()
    })

    it('does not show risk badge when no danger payments', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'safe' }),
        createMockPaymentRisk({ riskLevel: 'warning' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.queryByText(/at risk/)).not.toBeInTheDocument()
    })

    it('displays safe risk indicator correctly', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'safe' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      const safeIcon = screen.getByLabelText('Safe risk level')
      expect(safeIcon).toBeInTheDocument()
    })

    it('displays warning risk indicator correctly', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'warning' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      const warningIcon = screen.getByLabelText('Warning risk level')
      expect(warningIcon).toBeInTheDocument()
    })

    it('displays danger risk indicator correctly', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'danger' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      const dangerIcon = screen.getByLabelText('Risk risk level')
      expect(dangerIcon).toBeInTheDocument()
    })
  })

  describe('Payment List Display', () => {
    it('displays payment description', () => {
      const paymentRisks = [
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            description: 'Rent Payment',
          },
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('Rent Payment')).toBeInTheDocument()
    })

    it('displays payment amount with currency', () => {
      const paymentRisks = [
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            amount: 1500,
          },
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      // Check that the amount appears (will be in multiple places - summary and payment list)
      const amounts = screen.getAllByText(/1 500,00 ₴/)
      expect(amounts.length).toBeGreaterThan(0)
    })

    it('displays days until payment (singular)', () => {
      const paymentRisks = [
        createMockPaymentRisk({ daysUntil: 1 }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('in 1 day')).toBeInTheDocument()
    })

    it('displays days until payment (plural)', () => {
      const paymentRisks = [
        createMockPaymentRisk({ daysUntil: 5 }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('in 5 days')).toBeInTheDocument()
    })

    it('displays recommendation text', () => {
      const paymentRisks = [
        createMockPaymentRisk({
          recommendation: 'Balance will be tight after this payment',
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('Balance will be tight after this payment')).toBeInTheDocument()
    })

    it('limits display to maxDisplay prop', () => {
      const paymentRisks = Array.from({ length: 15 }, (_, i) =>
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            id: `tx-${i}`,
            description: `Payment ${i}`,
          },
        })
      )

      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          paymentRisks={paymentRisks}
          maxDisplay={5}
        />
      )

      // Should show only 5 payments
      expect(screen.getByText('Payment 0')).toBeInTheDocument()
      expect(screen.getByText('Payment 4')).toBeInTheDocument()
      expect(screen.queryByText('Payment 5')).not.toBeInTheDocument()

      // Should show "showing X of Y" message
      expect(screen.getByText('Showing 5 of 15 upcoming payments')).toBeInTheDocument()
    })

    it('does not show "showing more" message when all payments displayed', () => {
      const paymentRisks = [
        createMockPaymentRisk(),
        createMockPaymentRisk({ transaction: { ...createMockPaymentRisk().transaction, id: 'tx-2' } }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
    })
  })

  describe('Mark as Paid Functionality', () => {
    it('renders mark as paid button for each payment', () => {
      const paymentRisks = [
        createMockPaymentRisk({ transaction: { ...createMockPaymentRisk().transaction, id: 'tx-1' } }),
        createMockPaymentRisk({ transaction: { ...createMockPaymentRisk().transaction, id: 'tx-2' } }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByTestId('mark-paid-tx-1')).toBeInTheDocument()
      expect(screen.getByTestId('mark-paid-tx-2')).toBeInTheDocument()
    })

    it('calls onPaymentMarked callback when button clicked', async () => {
      const onPaymentMarked = vi.fn()
      const paymentRisks = [
        createMockPaymentRisk({ transaction: { ...createMockPaymentRisk().transaction, id: 'tx-1' } }),
      ]

      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          paymentRisks={paymentRisks}
          onPaymentMarked={onPaymentMarked}
        />
      )

      const button = screen.getByTestId('mark-paid-tx-1')
      fireEvent.click(button)

      await waitFor(() => {
        expect(onPaymentMarked).toHaveBeenCalledTimes(1)
      })
    })

    it('disables button while marking payment', async () => {
      const onPaymentMarked = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      const paymentRisks = [
        createMockPaymentRisk({ transaction: { ...createMockPaymentRisk().transaction, id: 'tx-1' } }),
      ]

      render(
        <UpcomingPaymentsWidget
          {...defaultProps}
          paymentRisks={paymentRisks}
          onPaymentMarked={onPaymentMarked}
        />
      )

      const button = screen.getByTestId('mark-paid-tx-1')
      fireEvent.click(button)

      // Button should be disabled while processing
      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for risk indicators', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'safe' }),
        createMockPaymentRisk({ 
          riskLevel: 'warning',
          transaction: { ...createMockPaymentRisk().transaction, id: 'tx-2' }
        }),
        createMockPaymentRisk({ 
          riskLevel: 'danger',
          transaction: { ...createMockPaymentRisk().transaction, id: 'tx-3' }
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByLabelText('Safe risk level')).toBeInTheDocument()
      expect(screen.getByLabelText('Warning risk level')).toBeInTheDocument()
      expect(screen.getByLabelText('Risk risk level')).toBeInTheDocument()
    })

    it('has proper role and aria-live for risk count badge', () => {
      const paymentRisks = [
        createMockPaymentRisk({ riskLevel: 'danger' }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      const badge = screen.getByText('1 at risk')
      expect(badge).toHaveAttribute('role', 'status')
      expect(badge).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Currency Formatting', () => {
    it('formats amounts with UAH currency', () => {
      const paymentRisks = [
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            amount: 1234.56,
          },
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} currency="UAH" paymentRisks={paymentRisks} />)

      // Check that the amount appears with UAH formatting
      const amounts = screen.getAllByText(/1 234,56 ₴/)
      expect(amounts.length).toBeGreaterThan(0)
    })

    it('formats amounts with USD currency', () => {
      const paymentRisks = [
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            amount: 1234.56,
          },
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} currency="USD" paymentRisks={paymentRisks} />)

      // Check that the amount appears with USD formatting
      const amounts = screen.getAllByText(/1 234,56 USD/)
      expect(amounts.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles payment with 0 days until', () => {
      const paymentRisks = [
        createMockPaymentRisk({ daysUntil: 0 }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      expect(screen.getByText('in 0 days')).toBeInTheDocument()
    })

    it('handles very long payment descriptions', () => {
      const longDescription = 'A'.repeat(200)
      const paymentRisks = [
        createMockPaymentRisk({
          transaction: {
            ...createMockPaymentRisk().transaction,
            description: longDescription,
          },
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      // Should truncate with line-clamp
      const element = screen.getByText(longDescription)
      expect(element).toBeInTheDocument()
      expect(element.className).toContain('truncate')
    })

    it('handles very long recommendations', () => {
      const longRecommendation = 'B'.repeat(200)
      const paymentRisks = [
        createMockPaymentRisk({
          recommendation: longRecommendation,
        }),
      ]

      render(<UpcomingPaymentsWidget {...defaultProps} paymentRisks={paymentRisks} />)

      // Should truncate with line-clamp-2
      const element = screen.getByText(longRecommendation)
      expect(element).toBeInTheDocument()
      expect(element.className).toContain('line-clamp-2')
    })
  })
})
