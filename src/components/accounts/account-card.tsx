/**
 * AccountCard Component
 * 
 * Displays an individual account with balance, type indicator, reconciliation status, and action buttons.
 * Features Executive Lounge styling with glass card effects, warm colors, and smooth interactions.
 * 
 * Requirements: 2.2, 2.3, 6.1, 6.2, 6.5, 7.1
 */

'use client'

import type { Account } from '@/types'
import { AccountTypeIcon } from './account-type-icon'
import { AccountTypeBadge } from './account-type-badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Edit2, Trash2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ReconciliationStatus } from '@/components/reconciliation/reconciliation-status'
import { UpdateBalanceDialog } from '@/components/reconciliation/update-balance-dialog'

export interface AccountCardProps {
  /**
   * The account to display
   */
  account: Account
  
  /**
   * Callback when edit button is clicked
   */
  onEdit?: (accountId: string) => void
  
  /**
   * Callback when delete button is clicked
   */
  onDelete?: (accountId: string) => void
  
  /**
   * Optional additional CSS classes
   */
  className?: string
}

/**
 * AccountCard component displays an individual account with:
 * - Glass card with Executive Lounge styling
 * - Account type icon (top-left)
 * - Account name as heading
 * - Formatted balance (large, prominent)
 * - Reconciliation status (difference display or "Reconciled" badge)
 * - Update Current Balance button (Requirements 2.1, 10.2)
 * - Account type badge
 * - Edit/Delete buttons (hover reveal on desktop, always visible on mobile)
 * - Negative balance styling (red tint for debt)
 * 
 * Design Features:
 * - Glass background with backdrop-filter blur
 * - Hover effects (elevation, transform)
 * - Mobile-first responsive design
 * - Accessibility-compliant touch targets (min 44px)
 * 
 * @example
 * <AccountCard 
 *   account={account} 
 *   onEdit={(id) => handleEdit(id)}
 *   onDelete={(id) => handleDelete(id)}
 * />
 */
export function AccountCard({ 
  account, 
  onEdit, 
  onDelete, 
  className 
}: AccountCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isUpdateBalanceDialogOpen, setIsUpdateBalanceDialogOpen] = useState(false)
  
  // Determine if balance is negative (debt)
  const isNegativeBalance = account.current_balance < 0
  
  // Format the balance with currency
  const formattedBalance = formatCurrency(account.current_balance, account.currency)
  
  // Handle edit button click
  const handleEdit = () => {
    onEdit?.(account.id)
  }
  
  // Handle delete button click
  const handleDelete = () => {
    onDelete?.(account.id)
  }
  
  // Handle update balance button click
  const handleUpdateBalance = () => {
    setIsUpdateBalanceDialogOpen(true)
  }
  
  // Handle dialog close
  const handleDialogClose = () => {
    setIsUpdateBalanceDialogOpen(false)
  }
  
  // Handle successful balance update
  const handleBalanceUpdateSuccess = () => {
    // The dialog will close automatically
    // The ReconciliationStatus component will re-fetch data automatically
  }
  
  return (
    <div
      className={cn(
        // Glass card with Executive Lounge styling
        'relative',
        'bg-glass backdrop-blur-[16px]',
        'border border-glass',
        'rounded-[20px]',
        'p-6',
        // Smooth transitions
        'transition-all duration-300 ease-out',
        // Hover effects
        'hover:shadow-[0_8px_32px_-8px_var(--shadow-elevated)]',
        'hover:-translate-y-0.5',
        // Negative balance indicator (red tint for debt)
        isNegativeBalance && 'border-accent-error/30 bg-accent-error/5',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`account-card-${account.name}`}
    >
      {/* Account Type Icon (top-left) */}
      <div className="flex items-start justify-between mb-4">
        <AccountTypeIcon 
          type={account.type} 
          className="w-8 h-8"
          aria-hidden="true"
        />
        
        {/* Action Buttons - Always visible on mobile, hover reveal on desktop */}
        <div 
          className={cn(
            'flex items-center gap-2',
            // Mobile: always visible
            'md:opacity-0 md:transition-opacity md:duration-200',
            // Desktop: show on hover
            isHovered && 'md:opacity-100'
          )}
        >
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-9 w-9 p-0"
              aria-label={`Edit ${account.name}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-9 w-9 p-0 text-accent-error hover:text-accent-error hover:bg-accent-error/10"
              aria-label={`Delete ${account.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Account Name (heading) */}
      <h3 
        className={cn(
          'text-lg font-semibold text-primary mb-2',
          'font-[family-name:var(--font-space-grotesk)]',
          'tracking-tight'
        )}
      >
        {account.name}
      </h3>
      
      {/* Balance (large, prominent) */}
      <p 
        className={cn(
          'text-3xl font-bold mb-3',
          'font-[family-name:var(--font-space-grotesk)]',
          'tracking-tight',
          // Negative balance styling
          isNegativeBalance ? 'text-accent-error' : 'text-primary'
        )}
        aria-label={`Balance: ${formattedBalance}`}
      >
        {formattedBalance}
      </p>
      
      {/* Reconciliation Status - Requirements 6.1, 6.2, 6.5 */}
      <div className="mb-3">
        <ReconciliationStatus accountId={account.id} />
      </div>
      
      {/* Update Balance Button - Requirements 2.1, 10.2 */}
      <div className="mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUpdateBalance}
          className={cn(
            'w-full',
            'flex items-center justify-center gap-2',
            'text-sm font-medium',
            'transition-all duration-200'
          )}
          aria-label={`Update current balance for ${account.name}`}
        >
          <RefreshCw className="w-4 h-4" />
          Update Current Balance
        </Button>
      </div>
      
      {/* Account Type Badge */}
      <div className="flex items-center justify-between">
        <AccountTypeBadge type={account.type} />
        
        {/* Default Account Indicator */}
        {account.is_default && (
          <span 
            className={cn(
              'text-xs font-medium',
              'text-accent-primary',
              'px-2 py-1',
              'bg-accent-primary/10',
              'rounded-full',
              'border border-accent-primary/20'
            )}
            role="status"
            aria-label="Default account"
          >
            Default
          </span>
        )}
      </div>
      
      {/* Negative Balance Warning (if applicable) */}
      {isNegativeBalance && (
        <div 
          className={cn(
            'mt-4 p-3',
            'bg-accent-error/10',
            'border border-accent-error/20',
            'rounded-lg'
          )}
          role="alert"
        >
          <p className="text-xs text-accent-error font-medium">
            This account has a negative balance
          </p>
        </div>
      )}
      
      {/* Update Balance Dialog - Requirements 2.1, 10.2 */}
      <UpdateBalanceDialog
        isOpen={isUpdateBalanceDialogOpen}
        account={account}
        onClose={handleDialogClose}
        onSuccess={handleBalanceUpdateSuccess}
      />
    </div>
  )
}
