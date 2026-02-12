/**
 * AccountCard Component Demo
 * 
 * Demonstrates the AccountCard component with various account types and states.
 */

'use client'

import { AccountCard } from '../account-card'
import type { Account } from '@/types'

// Mock accounts for demonstration
const mockAccounts: Account[] = [
  {
    id: '1',
    workspace_id: 'workspace-1',
    name: 'Main Checking',
    type: 'checking',
    opening_balance: 10000,
    current_balance: 12450.50,
    current_balance_updated_at: '2024-01-15T00:00:00Z',
    currency: 'UAH',
    is_default: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    workspace_id: 'workspace-1',
    name: 'Emergency Savings',
    type: 'savings',
    opening_balance: 45000,
    current_balance: 50000,
    current_balance_updated_at: '2024-01-15T00:00:00Z',
    currency: 'UAH',
    is_default: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    workspace_id: 'workspace-1',
    name: 'Credit Card',
    type: 'credit',
    opening_balance: 0,
    current_balance: -2500.75,
    current_balance_updated_at: '2024-01-15T00:00:00Z',
    currency: 'UAH',
    is_default: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    workspace_id: 'workspace-1',
    name: 'Investment Portfolio',
    type: 'investment',
    opening_balance: 100000,
    current_balance: 125000,
    current_balance_updated_at: '2024-01-15T00:00:00Z',
    currency: 'UAH',
    is_default: false,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
]

export function AccountCardDemo() {
  const handleEdit = (accountId: string) => {
    console.log('Edit account:', accountId)
    alert(`Edit account: ${accountId}`)
  }
  
  const handleDelete = (accountId: string) => {
    console.log('Delete account:', accountId)
    alert(`Delete account: ${accountId}`)
  }
  
  return (
    <div className="min-h-screen bg-primary p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8 font-[family-name:var(--font-space-grotesk)]">
          AccountCard Component Demo
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-primary mb-4 font-[family-name:var(--font-space-grotesk)]">
            States Demonstrated
          </h2>
          <ul className="space-y-2 text-secondary">
            <li>✓ Default account indicator (Main Checking)</li>
            <li>✓ Positive balance (Checking, Savings, Investment)</li>
            <li>✓ Negative balance with warning (Credit Card)</li>
            <li>✓ Different account types with unique icons and colors</li>
            <li>✓ Hover effects (desktop) - elevation and transform</li>
            <li>✓ Action buttons (always visible on mobile, hover reveal on desktop)</li>
            <li>✓ Glass card styling with Executive Lounge aesthetic</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
