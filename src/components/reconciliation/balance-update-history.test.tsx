/**
 * Tests for BalanceUpdateHistory Component
 * 
 * Validates Requirements 10.2, 10.3, 10.4, 10.5 from realtime-balance-reconciliation spec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BalanceUpdateHistory } from './balance-update-history'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { BalanceUpdateHistory as BalanceUpdateHistoryType } from '@/actions/balance-reconciliation'

// Mock the server actions
vi.mock('@/actions/balance-reconciliation', () => ({
  getBalanceUpdateHistory: vi.fn()
}))

// Mock date-fns to have consistent output
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}))

describe('BalanceUpdateHistory', () => {
  const mockHistory: BalanceUpdateHistoryType[] = [
    {
      id: '1',
      account_id: 'account-1',
      workspace_id: 'workspace-1',
      old_balance: 1000,
      new_balance: 1500,
      difference: 500,
      updated_by: 'user-1',
      updated_at: '2024-01-15T10:00:00Z',
      duration_since_last_update: 3600000 // 1 hour
    },
    {
      id: '2',
      account_id: 'account-1',
      workspace_id: 'workspace-1',
      old_balance: 800,
      new_balance: 1000,
      difference: 200,
      updated_by: 'user-1',
      updated_at: '2024-01-15T09:00:00Z',
      duration_since_last_update: 7200000 // 2 hours
    },
    {
      id: '3',
      account_id: 'account-1',
      workspace_id: 'workspace-1',
      old_balance: 1200,
      new_balance: 800,
      difference: -400,
      updated_by: 'user-1',
      updated_at: '2024-01-15T07:00:00Z',
      duration_since_last_update: undefined // Oldest entry
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Requirement 10.2: Display history table with old/new values and difference
   */
  describe('Requirement 10.2: History Table Display', () => {
    it('should display history table with old balance, new balance, and difference', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByText('Old Balance')).toBeInTheDocument()
      expect(screen.getByText('New Balance')).toBeInTheDocument()
      expect(screen.getByText('Difference')).toBeInTheDocument()

      // Check first entry values (using getAllByText since values may appear multiple times)
      const amounts = screen.getAllByText(/1\s?000[,.]00\s?₴/)
      expect(amounts.length).toBeGreaterThan(0) // Old balance appears
      
      expect(screen.getByText(/1\s?500[,.]00\s?₴/)).toBeInTheDocument() // New balance
      expect(screen.getByText(/\+.*500[,.]00\s?₴/)).toBeInTheDocument() // Positive difference

      // Check negative difference
      expect(screen.getByText(/-.*400[,.]00\s?₴/)).toBeInTheDocument()
    })

    it('should display empty state when no history exists', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: []
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('No balance updates found')).toBeInTheDocument()
      })

      expect(screen.getByText(/Balance updates will appear here/i)).toBeInTheDocument()
    })

    it('should display all history entries in the table', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Should have 3 rows (one for each history entry)
      const rows = screen.getAllByRole('row')
      expect(rows).toHaveLength(4) // 1 header + 3 data rows
    })
  })

  /**
   * Requirement 10.3: Show update timestamps and user who made change
   */
  describe('Requirement 10.3: Timestamps Display', () => {
    it('should display update timestamps for each entry', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check that timestamps are displayed
      expect(screen.getByText('Date & Time')).toBeInTheDocument()
      
      // Check for relative time display (mocked to "2 hours ago")
      const relativeTimeElements = screen.getAllByText('2 hours ago')
      expect(relativeTimeElements.length).toBeGreaterThan(0)
    })

    it('should format timestamps correctly', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: [mockHistory[0]]
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check that date is formatted (will vary by locale, so just check it exists)
      const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  /**
   * Requirement 10.4: Calculate and display time between updates
   */
  describe('Requirement 10.4: Duration Between Updates', () => {
    it('should display duration since last update', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check for duration display
      expect(screen.getByText('Time Since Last')).toBeInTheDocument()
      expect(screen.getByText('1h 0m')).toBeInTheDocument() // 3600000ms = 1 hour
      expect(screen.getByText('2h 0m')).toBeInTheDocument() // 7200000ms = 2 hours
    })

    it('should display dash for oldest entry with no previous update', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Oldest entry should show dash
      const dashElements = screen.getAllByText('—')
      expect(dashElements.length).toBeGreaterThan(0)
    })

    it('should format duration correctly for different time ranges', async () => {
      const historyWithVariedDurations: BalanceUpdateHistoryType[] = [
        {
          ...mockHistory[0],
          duration_since_last_update: 86400000 // 1 day
        },
        {
          ...mockHistory[1],
          duration_since_last_update: 3600000 // 1 hour
        },
        {
          ...mockHistory[2],
          duration_since_last_update: 60000 // 1 minute
        }
      ]

      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: historyWithVariedDurations
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check different duration formats
      expect(screen.getByText('1d 0h')).toBeInTheDocument() // 1 day
      expect(screen.getByText('1h 0m')).toBeInTheDocument() // 1 hour
      expect(screen.getByText('1m 0s')).toBeInTheDocument() // 1 minute
    })

    it('should display average time between updates in summary', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check for average calculation in footer
      expect(screen.getByText(/Average time between updates/i)).toBeInTheDocument()
      // Average of 3600000 and 7200000 = 5400000ms = 1h 30m
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })
  })

  /**
   * Requirement 10.5: Support filtering by account and date range
   */
  describe('Requirement 10.5: Filtering Support', () => {
    it('should display filter toggle button', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('should show filter panel when filter button is clicked', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Click filter button
      const filterButton = screen.getByText('Filters')
      fireEvent.click(filterButton)

      // Check filter panel is visible
      expect(screen.getByText('Start Date')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
      expect(screen.getByText('Reset Filters')).toBeInTheDocument()
    })

    it('should filter by date range when dates are selected', async () => {
      const mockGetHistory = vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory)
      mockGetHistory.mockResolvedValue({ data: mockHistory })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Open filters
      fireEvent.click(screen.getByText('Filters'))

      // Set start date
      const startDateInput = screen.getByLabelText('Start Date')
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-01'
          })
        )
      })

      // Set end date
      const endDateInput = screen.getByLabelText('End Date')
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } })

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          })
        )
      })
    })

    it('should reset filters when reset button is clicked', async () => {
      const mockGetHistory = vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory)
      mockGetHistory.mockResolvedValue({ data: mockHistory })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Open filters
      fireEvent.click(screen.getByText('Filters'))

      // Set dates
      const startDateInput = screen.getByLabelText('Start Date')
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-01'
          })
        )
      })

      // Reset filters
      const resetButton = screen.getByText('Reset Filters')
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            accountId: 'account-1',
            startDate: undefined,
            endDate: undefined
          })
        )
      })
    })

    it('should pass accountId filter to server action', async () => {
      const mockGetHistory = vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory)
      mockGetHistory.mockResolvedValue({ data: mockHistory })

      render(
        <BalanceUpdateHistory
          accountId="account-123"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            accountId: 'account-123'
          })
        )
      })
    })

    it('should pass workspaceId filter to server action', async () => {
      const mockGetHistory = vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory)
      mockGetHistory.mockResolvedValue({ data: mockHistory })

      render(
        <BalanceUpdateHistory
          workspaceId="workspace-456"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(mockGetHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: 'workspace-456'
          })
        )
      })
    })
  })

  /**
   * Additional UI/UX Tests
   */
  describe('UI/UX Behavior', () => {
    it('should display loading state while fetching data', () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should display error message when fetch fails', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        error: 'Failed to fetch history'
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch history')).toBeInTheDocument()
      })
    })

    it('should display positive differences with green color and up arrow', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: [mockHistory[0]] // Positive difference
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check for positive difference styling
      const positiveAmount = screen.getByText(/\+.*500[,.]00\s?₴/)
      expect(positiveAmount).toHaveClass('text-accent-success')
    })

    it('should display negative differences with red color and down arrow', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: [mockHistory[2]] // Negative difference
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Check for negative difference styling
      const negativeAmount = screen.getByText(/-.*400[,.]00\s?₴/)
      expect(negativeAmount).toHaveClass('text-accent-error')
    })

    it('should display total updates count in summary', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      expect(screen.getByText(/Total updates:/i)).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should apply custom className', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      const { container } = render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
          className="custom-class"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const glassCard = container.querySelector('.glass-card')
      expect(glassCard).toHaveClass('custom-class')
    })
  })

  /**
   * Executive Lounge Design System Tests
   */
  describe('Executive Lounge Design System', () => {
    it('should use glass card styling', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      const { container } = render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const glassCard = container.querySelector('.glass-card')
      expect(glassCard).toBeInTheDocument()
    })

    it('should use heading typography for title', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const title = screen.getByText('Balance Update History')
      expect(title).toHaveClass('heading')
    })

    it('should use form-input styling for date inputs', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      // Open filters
      fireEvent.click(screen.getByText('Filters'))

      const startDateInput = screen.getByLabelText('Start Date')
      expect(startDateInput).toHaveClass('form-input')
    })

    it('should use btn-secondary styling for buttons', async () => {
      vi.mocked(balanceReconciliationActions.getBalanceUpdateHistory).mockResolvedValue({
        data: mockHistory
      })

      render(
        <BalanceUpdateHistory
          accountId="account-1"
          currency="UAH"
        />
      )

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })

      const filterButton = screen.getByText('Filters').closest('button')
      expect(filterButton).toHaveClass('btn-secondary')
    })
  })
})
