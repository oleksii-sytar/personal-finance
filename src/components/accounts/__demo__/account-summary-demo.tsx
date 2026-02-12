/**
 * AccountSummary Demo
 * 
 * Demonstrates the AccountSummary component with various scenarios
 */

'use client'

import { AccountSummary } from '../account-summary'
import type { Account } from '@/types'

// Mock accounts for demonstration
const mockAccounts: Account[] = [
  {
    id: '1',
    workspace_id: 'workspace-1',
    name: 'Main Checking',
    type: 'checking',
    opening_balance: 3000,
    current_balance: 5000,
    current_balance_updated_at: '2024-01-01T00:00:00Z',
    currency: 'UAH',
    initial_balance: 3000,
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    workspace_id: 'workspace-1',
    name: 'Emergency Savings',
    type: 'savings',
    opening_balance: 8000,
    current_balance: 10000,
    current_balance_updated_at: '2024-01-02T00:00:00Z',
    currency: 'UAH',
    initial_balance: 8000,
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    workspace_id: 'workspace-1',
    name: 'Credit Card',
    type: 'credit',
    opening_balance: 0,
    current_balance: -2500,
    current_balance_updated_at: '2024-01-03T00:00:00Z',
    currency: 'UAH',
    initial_balance: 0,
    is_default: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    workspace_id: 'workspace-1',
    name: 'Investment Portfolio',
    type: 'investment',
    opening_balance: 20000,
    current_balance: 25000,
    current_balance_updated_at: '2024-01-04T00:00:00Z',
    currency: 'UAH',
    initial_balance: 20000,
    is_default: false,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
]

const emptyAccounts: Account[] = []

const singleAccount: Account[] = [mockAccounts[0]]

export function AccountSummaryDemo() {
  const handleAddAccount = () => {
    console.log('Add account clicked')
  }

  return (
    <div className="space-y-8 p-8 bg-primary min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">
          Multiple Accounts (with debt)
        </h2>
        <AccountSummary 
          accounts={mockAccounts} 
          onAddAccount={handleAddAccount}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">
          Single Account
        </h2>
        <AccountSummary 
          accounts={singleAccount} 
          onAddAccount={handleAddAccount}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">
          Empty State
        </h2>
        <AccountSummary 
          accounts={emptyAccounts} 
          onAddAccount={handleAddAccount}
        />
      </div>
    </div>
  )
}
