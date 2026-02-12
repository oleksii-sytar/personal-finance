'use client'

import { useState } from 'react'
import { AccountSelector } from '../account-selector'

/**
 * Demo component for AccountSelector
 * Shows the component in action with state management
 */
export function AccountSelectorDemo() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>()

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary mb-2">Account Selector Demo</h2>
        <p className="text-sm text-secondary mb-4">
          Select an account from the dropdown
        </p>
      </div>

      <AccountSelector
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        placeholder="Select an account..."
      />

      {selectedAccountId && (
        <div className="p-4 bg-glass border border-glass rounded-lg">
          <p className="text-sm text-secondary">Selected Account ID:</p>
          <p className="text-primary font-mono text-sm mt-1">{selectedAccountId}</p>
        </div>
      )}

      {!selectedAccountId && (
        <div className="p-4 bg-glass border border-glass rounded-lg">
          <p className="text-sm text-secondary">No account selected</p>
        </div>
      )}
    </div>
  )
}
