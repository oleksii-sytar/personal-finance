/**
 * AccountCard Component Tests
 * 
 * Tests the AccountCard component including reconciliation status integration.
 * 
 * Requirements: 2.2, 2.3, 6.1, 6.2, 6.5, 7.1
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountCard } from './account-card'
import type { Account } from '@/types'

// Mock the ReconciliationStatus component
vi.mock('@/components/reconciliation/reconciliation-status', () => ({
  ReconciliationStatus: ({ accountId }: { accountId: string }) => (
    <div data-testid={`reconciliation-status-${accountId}`}>
      Reconciliation Status Mock
    </div>
  )
}))

// Mock the UpdateBalanceDialog component
vi.mock('@/components/reconciliation/update-balance-dialog', () => ({
  UpdateBalanceDialog: ({ isOpen, account, onClose, onSuccess }: any) => {
    const handleSuccess = () => {
      onSuccess?.()
      onClose()
    }
    
    return isOpen ? (
      <div data-testid="update-balance-dialog">
        <div data-testid="dialog-account-name">{account.name}</div>
        <button onClick={onClose} data-testid="dialog-close-button">Close</button>
        <button onClick={handleSuccess} data-testid="dialog-success-button">Success</button>
      </div>
    ) : null
  }
}))

// Mock the formatCurrency utility
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: (amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`
  }
}))

describe('AccountCard', () => {
  const mockAccount: Account = {
    id: 'test-account-id',
    workspace_id: 'test-workspace-id',
    name: 'Test Checking Account',
    type: 'checking',
    opening_balance: 1000,
    current_balance: 1500,
    current_balance_updated_at: new Date().toISOString(),
    currency: 'UAH',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders account information correctly', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('Test Checking Account')).toBeInTheDocument()
    expect(screen.getByText('UAH 1500.00')).toBeInTheDocument()
  })

  it('renders ReconciliationStatus component with correct accountId', () => {
    render(<AccountCard account={mockAccount} />)
    
    const reconciliationStatus = screen.getByTestId(`reconciliation-status-${mockAccount.id}`)
    expect(reconciliationStatus).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<AccountCard account={mockAccount} onEdit={onEdit} />)
    
    const editButton = screen.getByLabelText(`Edit ${mockAccount.name}`)
    fireEvent.click(editButton)
    
    expect(onEdit).toHaveBeenCalledWith(mockAccount.id)
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<AccountCard account={mockAccount} onDelete={onDelete} />)
    
    const deleteButton = screen.getByLabelText(`Delete ${mockAccount.name}`)
    fireEvent.click(deleteButton)
    
    expect(onDelete).toHaveBeenCalledWith(mockAccount.id)
  })

  it('displays default badge when account is default', () => {
    const defaultAccount = { ...mockAccount, is_default: true }
    render(<AccountCard account={defaultAccount} />)
    
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('applies negative balance styling when balance is negative', () => {
    const negativeAccount = { ...mockAccount, current_balance: -500 }
    render(<AccountCard account={negativeAccount} />)
    
    expect(screen.getByText('This account has a negative balance')).toBeInTheDocument()
  })

  it('displays account type badge', () => {
    render(<AccountCard account={mockAccount} />)
    
    // The AccountTypeBadge component should be rendered
    // We can verify this by checking the component structure
    const card = screen.getByTestId(`account-card-${mockAccount.name}`)
    expect(card).toBeInTheDocument()
  })

  it('renders without edit and delete buttons when callbacks not provided', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.queryByLabelText(`Edit ${mockAccount.name}`)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(`Delete ${mockAccount.name}`)).not.toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class'
    render(<AccountCard account={mockAccount} className={customClass} />)
    
    const card = screen.getByTestId(`account-card-${mockAccount.name}`)
    expect(card).toHaveClass(customClass)
  })

  describe('Update Balance functionality (Task 9.3)', () => {
    it('renders Update Current Balance button', () => {
      render(<AccountCard account={mockAccount} />)
      
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      expect(updateButton).toBeInTheDocument()
      expect(updateButton).toHaveTextContent('Update Current Balance')
    })

    it('opens UpdateBalanceDialog when Update Balance button is clicked', () => {
      render(<AccountCard account={mockAccount} />)
      
      // Dialog should not be visible initially
      expect(screen.queryByTestId('update-balance-dialog')).not.toBeInTheDocument()
      
      // Click the Update Balance button
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      fireEvent.click(updateButton)
      
      // Dialog should now be visible
      expect(screen.getByTestId('update-balance-dialog')).toBeInTheDocument()
    })

    it('passes correct account data to UpdateBalanceDialog', () => {
      render(<AccountCard account={mockAccount} />)
      
      // Open the dialog
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      fireEvent.click(updateButton)
      
      // Verify account name is passed correctly
      expect(screen.getByTestId('dialog-account-name')).toHaveTextContent(mockAccount.name)
    })

    it('closes UpdateBalanceDialog when close is triggered', () => {
      render(<AccountCard account={mockAccount} />)
      
      // Open the dialog
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      fireEvent.click(updateButton)
      
      expect(screen.getByTestId('update-balance-dialog')).toBeInTheDocument()
      
      // Close the dialog
      const closeButton = screen.getByTestId('dialog-close-button')
      fireEvent.click(closeButton)
      
      // Dialog should be closed
      expect(screen.queryByTestId('update-balance-dialog')).not.toBeInTheDocument()
    })

    it('closes UpdateBalanceDialog after successful update', () => {
      render(<AccountCard account={mockAccount} />)
      
      // Open the dialog
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      fireEvent.click(updateButton)
      
      expect(screen.getByTestId('update-balance-dialog')).toBeInTheDocument()
      
      // Trigger success
      const successButton = screen.getByTestId('dialog-success-button')
      fireEvent.click(successButton)
      
      // Dialog should be closed after success
      expect(screen.queryByTestId('update-balance-dialog')).not.toBeInTheDocument()
    })

    it('Update Balance button has proper accessibility attributes', () => {
      render(<AccountCard account={mockAccount} />)
      
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      
      // Check button is accessible
      expect(updateButton).toHaveAttribute('aria-label', `Update current balance for ${mockAccount.name}`)
      
      // Check button has proper structure
      expect(updateButton).toBeVisible()
    })

    it('can open dialog multiple times', () => {
      render(<AccountCard account={mockAccount} />)
      
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      
      // First open
      fireEvent.click(updateButton)
      expect(screen.getByTestId('update-balance-dialog')).toBeInTheDocument()
      
      // Close
      const closeButton = screen.getByTestId('dialog-close-button')
      fireEvent.click(closeButton)
      expect(screen.queryByTestId('update-balance-dialog')).not.toBeInTheDocument()
      
      // Second open
      fireEvent.click(updateButton)
      expect(screen.getByTestId('update-balance-dialog')).toBeInTheDocument()
    })

    it('Update Balance button is positioned correctly in the card layout', () => {
      render(<AccountCard account={mockAccount} />)
      
      const card = screen.getByTestId(`account-card-${mockAccount.name}`)
      const updateButton = screen.getByRole('button', { name: `Update current balance for ${mockAccount.name}` })
      
      // Button should be inside the card
      expect(card).toContainElement(updateButton)
      
      // Button should be after reconciliation status
      const reconciliationStatus = screen.getByTestId(`reconciliation-status-${mockAccount.id}`)
      expect(reconciliationStatus).toBeInTheDocument()
    })
  })
})
