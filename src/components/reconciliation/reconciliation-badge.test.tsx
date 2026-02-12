/**
 * ReconciliationBadge Component Tests
 * 
 * Tests the ReconciliationBadge component for various reconciliation states.
 * Validates Requirements 5.3, 5.4, 5.5 from realtime-balance-reconciliation spec.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReconciliationBadge, ReconciliationBadgeSkeleton } from './reconciliation-badge'
import type { ReconciliationStatus } from '@/actions/balance-reconciliation'

// Mock the server action
vi.mock('@/actions/balance-reconciliation', () => ({
  getReconciliationStatus: vi.fn(),
}))

// Mock the format utility
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: vi.fn((amount: number, currency: string) => {
    return `${currency === 'UAH' ? '₴' : '$'}${amount.toFixed(2)}`
  }),
}))

import { getReconciliationStatus } from '@/actions/balance-reconciliation'

describe('ReconciliationBadge', () => {
  const mockWorkspaceId = 'test-workspace-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading skeleton while fetching data', () => {
      // Mock a delayed response
      vi.mocked(getReconciliationStatus).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      // Check for loading skeleton elements
      const loadingElement = screen.getByRole('status')
      expect(loadingElement).toBeInTheDocument()
      expect(loadingElement).toHaveClass('animate-pulse')
      expect(loadingElement).toHaveAttribute('aria-label', 'Loading reconciliation status')
    })
  })

  describe('All Reconciled State (Requirement 5.4)', () => {
    it('should display "All Reconciled" when total difference is zero', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        expect(screen.getByText('All Reconciled')).toBeInTheDocument()
      })

      // Check for success styling
      const badge = screen.getByRole('status')
      expect(badge).toHaveClass('bg-[var(--accent-success)]/10')
      expect(badge).toHaveAttribute('aria-label', 'All accounts reconciled')
    })

    it('should display CheckCircle icon when all reconciled', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const icon = screen.getByRole('status').querySelector('svg')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('text-[var(--accent-success)]')
      })
    })
  })

  describe('Non-Zero Difference State (Requirement 5.5)', () => {
    it('should display positive difference with success color', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 150.50,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        expect(screen.getByText('Difference:')).toBeInTheDocument()
        expect(screen.getByText('+₴150.50')).toBeInTheDocument()
      })

      // Check for positive difference styling (success color)
      const amountElement = screen.getByText('+₴150.50')
      expect(amountElement).toHaveClass('text-[var(--accent-success)]')
    })

    it('should display negative difference with error color', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: -250.75,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        expect(screen.getByText('Difference:')).toBeInTheDocument()
        expect(screen.getByText('-₴250.75')).toBeInTheDocument()
      })

      // Check for negative difference styling (error color)
      const amountElement = screen.getByText('-₴250.75')
      expect(amountElement).toHaveClass('text-[var(--accent-error)]')
    })

    it('should display AlertCircle icon when difference exists', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        const icon = badge.querySelector('svg')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveClass('text-[var(--accent-primary)]')
      })
    })

    it('should display warning styling for non-zero difference', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        expect(badge).toHaveClass('bg-[var(--accent-primary)]/10')
        expect(badge).toHaveClass('border-[var(--accent-primary)]/20')
      })
    })
  })

  describe('Error Handling', () => {
    it('should not render when error occurs', async () => {
      vi.mocked(getReconciliationStatus).mockResolvedValue({
        error: 'Failed to fetch reconciliation status',
      })

      const { container } = render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should not render when no data is returned', async () => {
      vi.mocked(getReconciliationStatus).mockResolvedValue({})

      const { container } = render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Accessibility (Requirement 5.3)', () => {
    it('should have proper ARIA labels for all reconciled state', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        expect(badge).toHaveAttribute('aria-label', 'All accounts reconciled')
      })
    })

    it('should have proper ARIA labels for difference state', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 150.50,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        expect(badge).toHaveAttribute('aria-label', 'Reconciliation difference: +₴150.50')
      })
    })
  })

  describe('Design System Compliance', () => {
    it('should use Executive Lounge glass card styling', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        expect(badge).toHaveClass('backdrop-blur-[16px]')
        expect(badge).toHaveClass('rounded-full')
        expect(badge).toHaveClass('transition-all')
      })
    })

    it('should use warm accent colors', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      render(<ReconciliationBadge workspaceId={mockWorkspaceId} />)

      await waitFor(() => {
        const badge = screen.getByRole('status')
        // Single Malt accent for warning
        expect(badge).toHaveClass('bg-[var(--accent-primary)]/10')
      })
    })
  })
})

describe('ReconciliationBadgeSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<ReconciliationBadgeSkeleton />)

    const skeleton = screen.getByRole('status')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('bg-[var(--bg-glass)]')
    expect(skeleton).toHaveClass('backdrop-blur-[16px]')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading reconciliation status')
  })

  it('should accept custom className', () => {
    render(<ReconciliationBadgeSkeleton className="custom-class" />)

    const skeleton = screen.getByRole('status')
    expect(skeleton).toHaveClass('custom-class')
  })
})
