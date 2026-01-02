'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { OnboardingFlow } from '@/components/shared/onboarding-flow'
import { ComingSoon } from '@/components/shared/coming-soon'

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D]"></div>
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
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Welcome to your new workspace!</span>
          </div>
          <p className="text-sm text-green-400/80 mt-1">
            You've successfully joined the workspace and can now collaborate on family finances.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Family Dashboard
        </h1>
        <p className="text-white/60 text-lg">
          Your family's financial overview and recent activity.
        </p>
        {currentWorkspace && (
          <p className="text-white/50 text-sm mt-2">
            Workspace: {currentWorkspace.name}
          </p>
        )}
      </div>

      {/* Coming Soon Placeholder */}
      <ComingSoon 
        title="Dashboard Coming Soon"
        description="We're building your family finance dashboard with balance tracking, recent transactions, and intelligent forecasting."
      />
    </div>
  )
}