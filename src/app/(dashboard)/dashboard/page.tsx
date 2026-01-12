'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { OnboardingFlow } from '@/components/shared/onboarding-flow'
import { ComingSoon } from '@/components/shared/coming-soon'
import { FloatingAddButton } from '@/components/transactions'
import { Card } from '@/components/ui/Card'

export default function DashboardPage() {
  const { currentWorkspace, workspaces, loading } = useWorkspace()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

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

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Overview */}
        <Card className="p-6">
          <ComingSoon 
            title="Balance Overview"
            description="Track your account balances and spending trends."
          />
        </Card>

        {/* Transaction Summary */}
        <Card className="p-6">
          <ComingSoon 
            title="Transaction Summary"
            description="Overview of your recent financial activity."
          />
        </Card>
      </div>

      {/* Additional Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      {/* Floating Add Button for quick transaction entry */}
      <FloatingAddButton 
        onTransactionCreated={(transaction) => {
          console.log('Transaction created:', transaction)
          // TODO: Refresh dashboard data when implemented
        }}
      />
    </div>
  )
}