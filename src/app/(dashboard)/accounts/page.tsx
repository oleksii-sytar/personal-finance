/**
 * AccountsPage - Main Account Management Dashboard
 * 
 * Client Component that displays all accounts with summary statistics.
 * Features Executive Lounge styling with glass cards, warm colors, and smooth interactions.
 * 
 * Requirements: 1.1, 2.1, 2.4, 2.5
 * 
 * Key Features:
 * - Workspace requirement check with onboarding message
 * - Server-side data fetching with getAccounts()
 * - AccountSummary widget at top
 * - Responsive grid of AccountCard components (1 col mobile, 2 col tablet, 3 col desktop)
 * - Floating "Add Account" button (bottom-right on mobile)
 * - Empty state for first-time users
 * - Loading states with Suspense
 * - Container padding and spacing
 */

'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { getAccounts } from '@/actions/accounts'
import { AccountsContent } from './accounts-content'
import { AccountsLoadingSkeleton } from './accounts-loading-skeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Wallet, Users, TrendingUp } from 'lucide-react'
import type { Account } from '@/actions/accounts'

/**
 * Main AccountsPage component
 * 
 * This is a Client Component that:
 * 1. Checks if user has a workspace
 * 2. Shows onboarding message if no workspace
 * 3. Fetches accounts data using getAccounts()
 * 4. Handles error states gracefully
 * 5. Delegates rendering to AccountsContent client component
 */
export default function AccountsPage() {
  const { currentWorkspace, workspaces, loading: workspaceLoading } = useWorkspace()
  const { openCreateModal } = useWorkspaceModal()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch accounts when workspace is available or when page becomes visible
  useEffect(() => {
    async function fetchAccounts() {
      if (!currentWorkspace) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await getAccounts()
        
        if (result.error) {
          const errorMessage = typeof result.error === 'string' 
            ? result.error 
            : 'Failed to load accounts'
          setError(errorMessage)
        } else {
          setAccounts(result.data || [])
          setError(null)
        }
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (!workspaceLoading) {
      fetchAccounts()
    }

    // Refetch accounts when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentWorkspace && !workspaceLoading) {
        fetchAccounts()
      }
    }

    // Refetch when accounts are created/updated/deleted
    const handleAccountsChanged = () => {
      if (currentWorkspace && !workspaceLoading) {
        fetchAccounts()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleAccountsChanged)
    window.addEventListener('accountsChanged', handleAccountsChanged)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleAccountsChanged)
      window.removeEventListener('accountsChanged', handleAccountsChanged)
    }
  }, [currentWorkspace, workspaceLoading])

  // Show loading while workspace data is being fetched
  if (workspaceLoading || (loading && currentWorkspace)) {
    return <AccountsLoadingSkeleton />
  }

  // Show onboarding message if user has no workspaces
  if (workspaces.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-2">
            Account Management
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Create a workspace to start managing your accounts
          </p>
        </div>

        {/* Workspace Required Notice */}
        <Card className="w-full max-w-2xl mx-auto p-8">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                Workspace Required
              </h2>
              <p className="text-[var(--text-secondary)]">
                You need to create a workspace before you can manage accounts. A workspace is your family's shared financial space.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[var(--text-primary)] text-center mb-4">
                What you can do with accounts:
              </h3>
              
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                  <Wallet className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[var(--text-secondary)]">Track multiple bank accounts, credit cards, and cash</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                  <TrendingUp className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[var(--text-secondary)]">Monitor balances and transaction history</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                  <Users className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[var(--text-secondary)]">Share account access with family members</span>
                </div>
              </div>
            </div>

            <div className="pt-4 text-center">
              <Button
                onClick={openCreateModal}
                className="w-full sm:w-auto"
              >
                Create Workspace Now
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-accent-error/10 border border-accent-error/20 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-accent-error mb-2">
            Failed to Load Accounts
          </h2>
          <p className="text-sm text-accent-error/80">
            {error}
          </p>
        </div>
      </div>
    )
  }
  
  return <AccountsContent accounts={accounts} />
}
