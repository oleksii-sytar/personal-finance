'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceCreationForm } from '@/components/forms/workspace-creation-form'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/Button'
import { Users, TrendingUp, Target, Shield } from 'lucide-react'

interface FeatureAccessNoticeProps {
  onCreateWorkspace: () => void
}

/**
 * Feature access notice for users who skipped workspace creation
 * Requirements: 4.5
 */
function FeatureAccessNotice({ onCreateWorkspace }: FeatureAccessNoticeProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-space-grotesk font-bold text-white/90 mb-2">
          Welcome to Forma
        </h1>
        <p className="text-white/60 text-lg">
          Create a workspace to unlock all features
        </p>
      </div>

      {/* Feature Restrictions Notice */}
      <Card className="w-full max-w-2xl mx-auto p-8">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white/90">
              Limited Access Mode
            </h2>
            <p className="text-white/60">
              You're currently in limited access mode. Create a workspace to unlock all features.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white/90 text-center mb-4">
              Features requiring a workspace:
            </h3>
            
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg opacity-50">
                <TrendingUp className="w-5 h-5 text-white/40" />
                <span className="text-white/60">Transaction tracking and management</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg opacity-50">
                <Users className="w-5 h-5 text-white/40" />
                <span className="text-white/60">Family member collaboration</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg opacity-50">
                <Target className="w-5 h-5 text-white/40" />
                <span className="text-white/60">Financial goals and forecasting</span>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center">
            <Button
              onClick={onCreateWorkspace}
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

/**
 * OnboardingFlow component for guiding new users through workspace creation
 * Requirements: 4.1, 4.5
 */
export function OnboardingFlow() {
  const [step, setStep] = useState<'loading' | 'welcome' | 'create-workspace' | 'complete' | 'skipped'>('loading')
  const [hasSkipped, setHasSkipped] = useState(false)
  
  const { user } = useAuth()
  const { workspaces, loading: workspaceLoading } = useWorkspace()
  const { openCreateModal } = useWorkspaceModal()
  const router = useRouter()

  // Check if user needs onboarding
  useEffect(() => {
    if (!workspaceLoading && user) {
      if (workspaces.length > 0) {
        // User already has workspaces, they don't need onboarding
        setStep('complete')
      } else {
        // Show welcome step
        setStep('welcome')
      }
    }
  }, [user, workspaces, workspaceLoading])

  const handleGetStarted = () => {
    openCreateModal()
  }

  const handleWorkspaceCreated = () => {
    setStep('complete')
    // Brief success message, then return to normal dashboard
    setTimeout(() => {
      // The dashboard will re-render with workspace content
      setStep('complete')
    }, 2000)
  }

  const handleSkip = () => {
    setHasSkipped(true)
    setStep('skipped')
  }

  const handleCreateFromSkipped = () => {
    openCreateModal()
  }

  if (step === 'loading' || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If user has completed onboarding or has workspaces, don't show onboarding
  if (step === 'complete' && workspaces.length > 0) {
    return null
  }

  // Show feature access notice for users who skipped
  if (step === 'skipped') {
    return <FeatureAccessNotice onCreateWorkspace={handleCreateFromSkipped} />
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-auto p-8 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-[#1C1917] font-bold text-2xl font-space-grotesk">F</span>
              </div>
              <h1 className="text-3xl font-bold text-white/90">
                Welcome to Forma
              </h1>
              <p className="text-lg text-white/60">
                Your family's financial management starts here
              </p>
            </div>

            <div className="grid gap-6 text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#E6A65D]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#E6A65D]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-1">Create a Workspace</h3>
                  <p className="text-sm text-white/60">
                    Set up a shared space where your family can collaborate on financial goals and track expenses together.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#E6A65D]/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#E6A65D]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-1">Track Transactions</h3>
                  <p className="text-sm text-white/60">
                    Record income, expenses, and transfers with our fast, intuitive interface designed for daily use.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#E6A65D]/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-[#E6A65D]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-1">Achieve Goals</h3>
                  <p className="text-sm text-white/60">
                    Set financial targets, track progress, and get intelligent forecasting to stay on track.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-8 py-3"
              >
                Get Started
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Remove the create-workspace step since we're using the modal now
  if (step === 'create-workspace') {
    // This should not happen anymore, but just in case
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto p-8 text-center">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-[#4E7A58]/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-[#4E7A58]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white/90">
                {hasSkipped ? 'Welcome to Forma!' : 'Workspace Created!'}
              </h2>
              <p className="text-white/60">
                {hasSkipped 
                  ? 'You can create a workspace anytime from your settings'
                  : 'Your workspace is ready. Loading your dashboard...'
                }
              </p>
            </div>

            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return null
}