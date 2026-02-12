/**
 * DeleteAccountDialog Component Demo
 * 
 * Demonstrates the DeleteAccountDialog component with various scenarios.
 */

'use client'

import { useState } from 'react'
import { DeleteAccountDialog } from '../delete-account-dialog'
import { Button } from '@/components/ui/Button'
import type { Account } from '@/types'

// Mock accounts for demonstration
const mockAccountWithoutTransactions: Account = {
  id: '1',
  workspace_id: 'workspace-1',
  name: 'Empty Savings',
  type: 'savings',
  opening_balance: 5000,
  current_balance: 5000,
  current_balance_updated_at: '2024-01-15T00:00:00Z',
  currency: 'UAH',
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

const mockAccountWithTransactions: Account = {
  id: '2',
  workspace_id: 'workspace-1',
  name: 'Active Checking',
  type: 'checking',
  opening_balance: 10000,
  current_balance: 12450.50,
  current_balance_updated_at: '2024-01-15T00:00:00Z',
  currency: 'UAH',
  is_default: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export function DeleteAccountDialogDemo() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [simulateTransactions, setSimulateTransactions] = useState(false)

  const handleDelete = (account: Account, hasTransactions: boolean) => {
    setSelectedAccount(account)
    setSimulateTransactions(hasTransactions)
    setDialogOpen(true)
  }

  const handleConfirm = async (): Promise<{ success: boolean; error?: string }> => {
    // Simulate server action delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (simulateTransactions) {
      // Simulate error when account has transactions
      return {
        success: false,
        error: 'Cannot delete account with existing transactions'
      }
    }
    
    // Simulate successful deletion
    console.log('Account deleted:', selectedAccount?.name)
    alert(`Account "${selectedAccount?.name}" deleted successfully!`)
    setDialogOpen(false)
    return { success: true }
  }

  const handleDeleteSuccess = () => {
    console.log('Account deleted:', selectedAccount?.name)
    alert(`Account "${selectedAccount?.name}" deleted successfully!`)
    setDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-primary p-8">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-primary mb-8 font-[family-name:var(--font-space-grotesk)]">
          DeleteAccountDialog Component Demo
        </h1>
        
        <div className="space-y-6">
          {/* Scenario 1: Account without transactions */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">
              Scenario 1: Account Without Transactions
            </h2>
            <p className="text-secondary mb-4">
              This account has no transactions and can be deleted successfully.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">{mockAccountWithoutTransactions.name}</p>
                <p className="text-sm text-secondary">Balance: ₴{mockAccountWithoutTransactions.current_balance.toLocaleString()}</p>
              </div>
              <Button
                onClick={() => handleDelete(mockAccountWithoutTransactions, false)}
                variant="secondary"
              >
                Delete Account
              </Button>
            </div>
          </div>

          {/* Scenario 2: Account with transactions */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">
              Scenario 2: Account With Transactions
            </h2>
            <p className="text-secondary mb-4">
              This account has transactions and cannot be deleted. An error message will be shown.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">{mockAccountWithTransactions.name}</p>
                <p className="text-sm text-secondary">Balance: ₴{mockAccountWithTransactions.current_balance.toLocaleString()}</p>
              </div>
              <Button
                onClick={() => handleDelete(mockAccountWithTransactions, true)}
                variant="secondary"
              >
                Try to Delete
              </Button>
            </div>
          </div>

          {/* Features list */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-primary mb-4 font-[family-name:var(--font-space-grotesk)]">
              Features Demonstrated
            </h2>
            <ul className="space-y-2 text-secondary">
              <li>✓ Transaction check before deletion</li>
              <li>✓ Error message when account has transactions</li>
              <li>✓ Confirmation dialog for accounts without transactions</li>
              <li>✓ Warning about permanent deletion</li>
              <li>✓ Loading state during deletion</li>
              <li>✓ Executive Lounge dialog styling (glass effect, warm colors)</li>
              <li>✓ Proper error handling and user feedback</li>
              <li>✓ Accessible keyboard navigation</li>
            </ul>
          </div>
        </div>

        {/* Dialog */}
        {selectedAccount && (
          <DeleteAccountDialog
            account={selectedAccount}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </div>
    </div>
  )
}
