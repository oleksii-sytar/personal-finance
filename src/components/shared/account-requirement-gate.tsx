'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { getAccounts, type Account } from '@/actions/accounts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Wallet, TrendingUp, Target, Plus, ArrowRight } from 'lucide-react'

interface AccountRequirementGateProps {
  children: ReactNode
  featureName: string
  description: string
}

/**
 * AccountRequirementGate component that restricts access to features requiring accounts
 * Requirements: 2.2.2 - Transactions page requires workspace AND at least one account
 * 
 * This component:
 * 1. Checks if user has a workspace (via useWorkspace)
 * 2. Checks if user has at least one account (via getAccounts)
 * 3. Shows "Create Account First" message when no accounts
 * 4. Provides quick account creation flow
 */
export function AccountRequirementGate({ 
  children, 
  featureName, 
  description 
}: AccountRequirementGateProps) {
  const { currentWorkspace, workspaces, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch accounts when workspace is available
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
  }, [currentWorkspace, workspaceLoading])

  // Show loading while checking workspace and account status
  if (loading || workspaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D]"></div>
      </div>
    )
  }

  // If user has workspace and accounts, show the feature
  if (workspaces.length > 0 && currentWorkspace && accounts.length > 0) {
    return <>{children}</>
  }

  // Show account creation notice
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-2">
          {featureName}
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          {description}
        </p>
      </div>

      {/* Account Required Notice */}
      <Card className="w-full max-w-2xl mx-auto p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Create Your First Account
            </h2>
            <p className="text-[var(--text-secondary)]">
              Before you can track transactions, you need to create at least one account. 
              Accounts represent your bank accounts, credit cards, or cash holdings.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] text-center mb-4">
              Why accounts matter:
            </h3>
            
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg">
                <Wallet className="w-5 h-5 text-[var(--accent-primary)]" />
                <span className="text-[var(--text-secondary)]">
                  Track balances across multiple accounts
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg">
                <TrendingUp className="w-5 h-5 text-[var(--accent-primary)]" />
                <span className="text-[var(--text-secondary)]">
                  See where your money is and where it's going
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg">
                <Target className="w-5 h-5 text-[var(--accent-primary)]" />
                <span className="text-[var(--text-secondary)]">
                  Reconcile accounts to ensure accuracy
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push('/accounts')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Account
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              Back to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="pt-4 border-t border-[var(--border-primary)]">
            <p className="text-sm text-[var(--text-muted)] text-center">
              💡 Tip: Start with your main checking account or the account you use most frequently
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
