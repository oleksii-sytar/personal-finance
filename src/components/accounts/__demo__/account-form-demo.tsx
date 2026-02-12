'use client'

import { useState } from 'react'
import { AccountForm } from '../account-form'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Account } from '@/actions/accounts'

/**
 * Demo component for AccountForm
 * Shows both create and edit modes
 */
export function AccountFormDemo() {
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [showSuccess, setShowSuccess] = useState(false)

  // Mock account for edit mode
  const mockAccount: Account = {
    id: 'demo-account-id',
    workspace_id: 'demo-workspace-id',
    name: 'Main Checking',
    type: 'checking',
    opening_balance: 5000,
    current_balance: 5000,
    current_balance_updated_at: new Date().toISOString(),
    currency: 'UAH',
    initial_balance: 5000,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const handleSuccess = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            AccountForm Component Demo
          </h1>
          <p className="text-[var(--text-secondary)]">
            Interactive demonstration of the account creation and editing form
          </p>
        </div>

        {/* Mode Selector */}
        <Card className="p-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-[var(--text-primary)]">Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={mode === 'create' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode('create')}
              >
                Create Mode
              </Button>
              <Button
                variant={mode === 'edit' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode('edit')}
              >
                Edit Mode
              </Button>
            </div>
          </div>
        </Card>

        {/* Success Message */}
        {showSuccess && (
          <div className="p-4 bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 rounded-lg">
            <p className="text-sm text-[var(--accent-success)] text-center">
              ✓ Account {mode === 'create' ? 'created' : 'updated'} successfully!
            </p>
          </div>
        )}

        {/* Form Card */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                {mode === 'create' ? 'Create New Account' : 'Edit Account'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {mode === 'create' 
                  ? 'Fill in the details to create a new financial account'
                  : 'Update the account details below'
                }
              </p>
            </div>

            <AccountForm
              account={mode === 'edit' ? mockAccount : undefined}
              onSuccess={handleSuccess}
              onCancel={() => console.log('Cancel clicked')}
            />
          </div>
        </Card>

        {/* Feature Highlights */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Component Features
          </h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Account name validation (1-100 characters, required)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Account type selection (checking, savings, credit, investment)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Initial balance input (create mode only)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Currency display (read-only, inherited from workspace)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Real-time validation with Zod schema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Executive Lounge styling (glass inputs, rounded corners)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Loading states during submission</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent-primary)]">✓</span>
              <span>Accessible form with ARIA attributes</span>
            </li>
          </ul>
        </Card>

        {/* Requirements Coverage */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Requirements Coverage
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-2">Create Mode</h4>
              <ul className="space-y-1 text-[var(--text-secondary)]">
                <li>• Req 1.2: Account name input</li>
                <li>• Req 1.3: Account type selection</li>
                <li>• Req 1.4: Initial balance input</li>
                <li>• Req 1.5: Currency inheritance</li>
                <li>• Req 9.1-9.5: Validation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-2">Edit Mode</h4>
              <ul className="space-y-1 text-[var(--text-secondary)]">
                <li>• Req 3.2: Name editing</li>
                <li>• Req 3.3: Type editing</li>
                <li>• Req 3.4: Balance read-only</li>
                <li>• Req 3.5: Currency read-only</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
