'use client'

import { useWorkspace } from '@/contexts/workspace-context'
import { OnboardingFlow } from '@/components/shared/onboarding-flow'
import { ComingSoon } from '@/components/shared/coming-soon'

export default function DashboardPage() {
  const { currentWorkspace, workspaces, loading } = useWorkspace()

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