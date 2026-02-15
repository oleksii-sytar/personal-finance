'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { OnboardingFlow } from '@/components/shared/onboarding-flow'
import { ComingSoon } from '@/components/shared/coming-soon'
import { FloatingAddButton } from '@/components/transactions'
import { Card } from '@/components/ui/Card'
import { CurrentMonthOverview } from '@/components/forecast/current-month-overview'
import { BalanceOverviewWidget } from '@/components/forecast/balance-overview-widget'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useAccountBalances } from '@/hooks/use-account-balances'

export default function DashboardPage() {
  const { currentWorkspace, workspaces, loading } = useWorkspace()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Get current month for spending overview
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed

  // Fetch transactions for current month
  const { 
    data: transactions = [], 
    isLoading: transactionsLoading, 
    error: transactionsError 
  } = useTransactions()

  // Fetch accounts and balances for balance overview
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts
  } = useAccounts()

  const {
    data: accountBalances = [],
    isLoading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances
  } = useAccountBalances()

  // Listen for account changes and refetch data
  useEffect(() => {
    const handleAccountsChanged = () => {
      refetchAccounts()
      refetchBalances()
    }

    window.addEventListener('accountsChanged', handleAccountsChanged)
    return () => window.removeEventListener('accountsChanged', handleAccountsChanged)
  }, [refetchAccounts, refetchBalances])

  // Check for invitation acceptance success
  useEffect(() => {
    if (searchParams.get('invitation_accepted') === 'true') {
      setShowSuccessMessage(true)
      
      // Hide message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Show loading while workspace data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    )
  }

  // Show onboarding flow if user has no workspaces
  if (workspaces.length === 0) {
    return <OnboardingFlow />
  }

  // Show dashboard content if user has a workspace
  return (
    <div className="space-y-8">
      {/* Success Message for Invitation Acceptance */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 rounded-lg">
          <div className="flex items-center gap-2 text-[var(--accent-success)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Welcome to your new workspace!</span>
          </div>
          <p className="text-sm text-[var(--accent-success)] opacity-80 mt-1">
            You've successfully joined the workspace and can now collaborate on family finances.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-2">
          Family Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Your family's financial overview and recent activity.
        </p>
        {currentWorkspace && (
          <p className="text-[var(--text-secondary)] opacity-80 text-sm mt-2">
            Workspace: {currentWorkspace.name}
          </p>
        )}
      </div>

      {/* Dashboard Grid - Responsive Layout */}
      <div className="space-y-6">
        {/* Top Row: Balance Overview (Full Width on Mobile, Half on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Overview Widget */}
          <BalanceOverviewWidget
            accounts={accounts}
            accountBalances={accountBalances}
            currency="UAH"
            isLoading={accountsLoading || balancesLoading}
            error={accountsError?.message || balancesError?.message}
            showReconciliationLink={true}
          />

          {/* Current Month Overview Widget */}
          <CurrentMonthOverview
            transactions={transactions}
            currency="UAH"
            year={currentYear}
            month={currentMonth}
            isLoading={transactionsLoading}
            error={transactionsError?.message}
          />
        </div>

        {/* Second Row: Additional Widgets (3 columns on desktop, 1 on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <ComingSoon 
              title="Recent Transactions"
              description="View your latest financial activity."
            />
          </Card>
          
          <Card className="p-6">
            <ComingSoon 
              title="Monthly Forecast"
              description="Intelligent predictions for your spending patterns."
            />
          </Card>
          
          <Card className="p-6">
            <ComingSoon 
              title="Goals & Targets"
              description="Track your financial goals and savings targets."
            />
          </Card>
        </div>
      </div>

      {/* Floating Add Button for quick transaction entry */}
      <FloatingAddButton 
        onTransactionCreated={(transaction) => {
          // Transaction created - dashboard will refresh automatically via React Query
        }}
      />
    </div>
  )
}