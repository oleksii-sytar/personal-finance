/**
 * AccountsContent - Client Component for Account Management
 * 
 * Handles interactive features of the accounts page including:
 * - Account creation modal
 * - Account editing modal
 * - Account deletion dialog
 * - Floating action button
 * 
 * Requirements: 1.1, 2.1, 2.4, 2.5
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Account } from '@/types'
import { AccountSummary } from '@/components/accounts/account-summary'
import { AccountCard } from '@/components/accounts/account-card'
import { AccountForm } from '@/components/accounts/account-form'
import { DeleteAccountDialog } from '@/components/accounts/delete-account-dialog'
import { Modal, ModalBody } from '@/components/ui/modal'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Account as ActionAccount } from '@/actions/accounts'

interface AccountsContentProps {
  accounts: ActionAccount[]
}

/**
 * AccountsContent component
 * 
 * Displays:
 * - AccountSummary widget at top
 * - Responsive grid of AccountCard components
 * - Floating "Add Account" button
 * - Empty state for first-time users
 * - Modals for create/edit/delete operations
 */
export function AccountsContent({ accounts }: AccountsContentProps) {
  const router = useRouter()
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Selected account for edit/delete
  const [selectedAccount, setSelectedAccount] = useState<ActionAccount | null>(null)
  
  // Handle add account button click
  const handleAddAccount = () => {
    setIsCreateModalOpen(true)
  }
  
  // Handle edit account
  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      setSelectedAccount(account)
      setIsEditModalOpen(true)
    }
  }
  
  // Handle delete account
  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      setSelectedAccount(account)
      setIsDeleteDialogOpen(true)
    }
  }
  
  // Handle form success (create/edit)
  const handleFormSuccess = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedAccount(null)
    router.refresh() // Refresh server data
  }
  
  // Handle delete success
  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false)
    setSelectedAccount(null)
    router.refresh() // Refresh server data
  }
  
  // Handle modal close
  const handleModalClose = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedAccount(null)
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Account Summary Widget */}
      <AccountSummary 
        accounts={accounts} 
        onAddAccount={handleAddAccount}
      />
      
      {/* Empty State - First-time users */}
      {accounts.length === 0 ? (
        <div 
          className={cn(
            'bg-glass backdrop-blur-[16px]',
            'border border-glass',
            'rounded-[20px]',
            'p-12',
            'text-center'
          )}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div 
              className={cn(
                'w-16 h-16 mx-auto',
                'bg-accent-primary/10',
                'rounded-full',
                'flex items-center justify-center'
              )}
            >
              <Plus className="w-8 h-8 text-accent-primary" />
            </div>
            
            <h2 
              className={cn(
                'text-2xl font-bold text-primary',
                'font-[family-name:var(--font-space-grotesk)]'
              )}
            >
              No Accounts Yet
            </h2>
            
            <p className="text-secondary">
              Get started by creating your first financial account. 
              You can add checking, savings, credit, or investment accounts.
            </p>
            
            <button
              onClick={handleAddAccount}
              className={cn(
                'inline-flex items-center gap-2',
                'px-6 py-3',
                'bg-gradient-to-r from-accent-primary to-accent-primary',
                'text-inverse font-medium',
                'rounded-full',
                'shadow-[0_4px_20px_-5px_var(--shadow-primary)]',
                'hover:shadow-[0_6px_25px_-5px_var(--shadow-primary)]',
                'hover:-translate-y-0.5',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2'
              )}
            >
              <Plus className="w-5 h-5" />
              Create Your First Account
            </button>
          </div>
        </div>
      ) : (
        /* Account Grid - Responsive layout */
        <div 
          className={cn(
            'grid gap-4',
            'grid-cols-1',           // 1 column on mobile
            'md:grid-cols-2',        // 2 columns on tablet
            'lg:grid-cols-3'         // 3 columns on desktop
          )}
        >
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
            />
          ))}
        </div>
      )}
      
      {/* Floating Action Button - Bottom-right on mobile */}
      {accounts.length > 0 && (
        <button
          onClick={handleAddAccount}
          className={cn(
            'fixed bottom-6 right-6',
            'w-14 h-14',
            'bg-gradient-to-r from-accent-primary to-accent-primary',
            'text-inverse',
            'rounded-full',
            'shadow-[0_8px_32px_-8px_var(--shadow-elevated)]',
            'hover:shadow-[0_12px_40px_-8px_var(--shadow-elevated)]',
            'hover:-translate-y-1',
            'transition-all duration-200',
            'flex items-center justify-center',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2',
            'z-50'
          )}
          aria-label="Add new account"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
      
      {/* Create Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        title="Create New Account"
        size="md"
      >
        <ModalBody>
          <AccountForm
            onSuccess={handleFormSuccess}
            onCancel={handleModalClose}
          />
        </ModalBody>
      </Modal>
      
      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        title="Edit Account"
        size="md"
      >
        <ModalBody>
          {selectedAccount && (
            <AccountForm
              account={selectedAccount}
              onSuccess={handleFormSuccess}
              onCancel={handleModalClose}
            />
          )}
        </ModalBody>
      </Modal>
      
      {/* Delete Account Dialog */}
      {selectedAccount && (
        <DeleteAccountDialog
          account={selectedAccount}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
