/**
 * Balance Overview Widget Tests
 * 
 * Tests for the BalanceOverviewWidget component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BalanceOverviewWidget } from '../balance-overview-widget'
import type { Account } from '@/types'
import type { AccountBalance } from '@/actions/balance-reconciliation'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('BalanceOverviewWidget', () => {
  const mockAccounts: Account[] = [
    {
      id: '1',
      workspace_id: 'workspace-1',
      name: 'Checking Account',
      type: 'checking',
      opening_balance: 1000,
      current_balance: 1500,
      current_balance_updated_at: '2024-01-01T00:00:00Z',
      currency: 'UAH',
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      workspace_id: 'workspace-1',
      name: 'Savings Account',
      type: 'savings',
      opening_balance: 5000,
      current_balance: 5500,
      current_balance_updated_at: '2024-01-01T00:00:00Z',
      currency: 'UAH',
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      workspace_id: 'workspace-1',
      name: 'Credit Card',
      type: 'credit',
      opening_balance: 0,
      current_balance: -500,
      current_balance_updated_at: '2024-01-01T00:00:00Z',
      currency: 'UAH',
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockAccountBalances: AccountBalance[] = [
    {
      account_id: '1',
      opening_balance: 1000,
      current_balance: 1500,
      calculated_balance: 1500,
      difference: 0,
      currency: 'UAH',
      is_reconciled: true,
    },
    {
      account_id: '2',
      opening_balance: 5000,
      current_balance: 5500,
      calculated_balance: 5450,
      difference: 50,
      currency: 'UAH',
      is_reconciled: false,
    },
    {
      account_id: '3',
      opening_balance: 0,
      current_balance: -500,
      calculated_balance: -500,
      difference: 0,
      currency: 'UAH',
      is_reconciled: true,
    },
  ]

  it('renders loading state', () => {
    render(
      <BalanceOverviewWidget
        accounts={[]}
        currency="UAH"
        isLoading={true}
      />
    )

    expect(screen.getByText('Balance Overview')).toBeInTheDocument()
    // Loading skeleton should be present
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error state', () => {
    render(
      <BalanceOverviewWidget
        accounts={[]}
        currency="UAH"
        error="Failed to load accounts"
      />
    )

    expect(screen.getByText(/Failed to load accounts/i)).toBeInTheDocument()
  })

  it('renders empty state when no accounts', () => {
    render(
      <BalanceOverviewWidget
        accounts={[]}
        currency="UAH"
      />
    )

    expect(screen.getByText('No accounts yet')).toBeInTheDocument()
    expect(screen.getByText(/Create your first account/i)).toBeInTheDocument()
  })

  it('displays total balance correctly', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        currency="UAH"
      />
    )

    // Total balance should be 1500 + 5500 - 500 = 6500
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
    // Currency format uses space separator: "6 500,00 ₴"
    expect(screen.getByText(/6 500,00 ₴/)).toBeInTheDocument()
  })

  it('separates assets and debts', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        currency="UAH"
      />
    )

    // Assets: 1500 + 5500 = 7000
    expect(screen.getByText(/Assets \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/7 000,00 ₴/)).toBeInTheDocument()

    // Debts: 500 - check within the Debts section
    expect(screen.getByText(/Debts \(1\)/)).toBeInTheDocument()
    // Use getAllByText and check the one with red-500 class
    const debtElements = screen.getAllByText(/500,00 ₴/)
    const debtElement = debtElements.find(el => el.className.includes('text-red-500'))
    expect(debtElement).toBeInTheDocument()
  })

  it('displays all accounts in list', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        currency="UAH"
      />
    )

    expect(screen.getByText('Checking Account')).toBeInTheDocument()
    expect(screen.getByText('Savings Account')).toBeInTheDocument()
    expect(screen.getByText('Credit Card')).toBeInTheDocument()
  })

  it('shows reconciliation status for each account', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={mockAccountBalances}
        currency="UAH"
      />
    )

    // Should show reconciled icons for accounts 1 and 3
    const reconciledIcons = screen.getAllByLabelText('Reconciled')
    expect(reconciledIcons).toHaveLength(2)

    // Should show needs reconciliation icon for account 2
    const needsReconciliationIcon = screen.getByLabelText('Needs reconciliation')
    expect(needsReconciliationIcon).toBeInTheDocument()
  })

  it('displays reconciliation difference for unreconciled accounts', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={mockAccountBalances}
        currency="UAH"
      />
    )

    // Account 2 has a difference of 50
    expect(screen.getByText(/Difference: \+50,00 ₴/)).toBeInTheDocument()
  })

  it('shows "All Reconciled" badge when all accounts reconciled', () => {
    const allReconciledBalances: AccountBalance[] = mockAccountBalances.map(ab => ({
      ...ab,
      is_reconciled: true,
      difference: 0,
    }))

    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={allReconciledBalances}
        currency="UAH"
      />
    )

    expect(screen.getByText('All Reconciled')).toBeInTheDocument()
  })

  it('shows needs reconciliation count badge', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={mockAccountBalances}
        currency="UAH"
      />
    )

    // 1 account needs reconciliation
    expect(screen.getByText('1 Needs Reconciliation')).toBeInTheDocument()
  })

  it('displays reconciliation link when accounts need reconciliation', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={mockAccountBalances}
        currency="UAH"
        showReconciliationLink={true}
      />
    )

    const link = screen.getByText('Reconcile Accounts')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/accounts')
  })

  it('hides reconciliation link when showReconciliationLink is false', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={mockAccountBalances}
        currency="UAH"
        showReconciliationLink={false}
      />
    )

    expect(screen.queryByText('Reconcile Accounts')).not.toBeInTheDocument()
  })

  it('hides reconciliation link when all accounts reconciled', () => {
    const allReconciledBalances: AccountBalance[] = mockAccountBalances.map(ab => ({
      ...ab,
      is_reconciled: true,
      difference: 0,
    }))

    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        accountBalances={allReconciledBalances}
        currency="UAH"
        showReconciliationLink={true}
      />
    )

    expect(screen.queryByText('Reconcile Accounts')).not.toBeInTheDocument()
  })

  it('displays account types correctly', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        currency="UAH"
      />
    )

    expect(screen.getByText('checking')).toBeInTheDocument()
    expect(screen.getByText('savings')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
  })

  it('handles accounts with zero balance', () => {
    const accountsWithZero: Account[] = [
      {
        ...mockAccounts[0],
        current_balance: 0,
      },
    ]

    render(
      <BalanceOverviewWidget
        accounts={accountsWithZero}
        currency="UAH"
      />
    )

    // Check that zero balance is displayed (appears twice: total and account)
    const zeroBalances = screen.getAllByText(/0,00 ₴/)
    expect(zeroBalances.length).toBeGreaterThan(0)
  })

  it('displays correct account count', () => {
    render(
      <BalanceOverviewWidget
        accounts={mockAccounts}
        currency="UAH"
      />
    )

    expect(screen.getByText('Accounts (3)')).toBeInTheDocument()
  })
})
