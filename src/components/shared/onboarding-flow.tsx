'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { LazyWorkspaceCreationForm } from '@/components/forms/lazy'
import { FormLoadingSkeleton } from '@/components/shared/form-loading-skeleton'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { Card } from '@/components/ui/Card'
import { FullScreenLoading } from '@/components/shared/full-screen-loading'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/Button'
import { Users, TrendingUp, Target, Shield, CheckCircle2, Circle } from 'lucide-react'

interface FeatureAccessNoticeProps {
  onCreateWorkspace: () => void
}

/**
 * Progress indicator component showing onboarding steps
 * Requirements: 2.1.5 - Clear next action with progress indicators
 */
interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  steps: Array<{ label: string; description: string }>
}

function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep
          
          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent-success)] text-white'
                      : isCurrent
                      ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)] ring-4 ring-[var(--accent-primary)]/20'
                      : 'bg-[var(--bg-glass)] text-[var(--text-muted)] border border-[var(--border-primary)]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[120px]">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent-success)]'
                      : 'bg-[var(--border-primary)]'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Feature access notice for users who skipped workspace creation
 * Requirements: 4.5, 2.1.5 - Clear next action with single prominent button
 */
function FeatureAccessNotice({ onCreateWorkspace }: FeatureAccessNoticeProps) {
  const onboardingSteps = [
    { label: 'Welcome', description: 'Get started' },
    { label: 'Workspace', description: 'Create order' },
    { label: 'Accounts', description: 'Add structure' },
    { label: 'Transactions', description: 'Start tracking' }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-4xl mx-auto">
        {/* Progress Indicator - showing we're stuck at step 1 */}
        <ProgressIndicator currentStep={1} totalSteps={4} steps={onboardingSteps} />

        <div className="space-y-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-2">
              Welcome to Forma
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">
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
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  Limited Access Mode
                </h2>
                <p className="text-[var(--text-secondary)]">
                  You're currently in limited access mode. Create a workspace to unlock all features and start your financial journey.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-[var(--text-primary)] text-center mb-4">
                  Features requiring a workspace:
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                    <TrendingUp className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                    <span className="text-[var(--text-secondary)]">Transaction tracking and management</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                    <Users className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                    <span className="text-[var(--text-secondary)]">Family member collaboration</span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                    <Target className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />
                    <span className="text-[var(--text-secondary)]">Financial goals and forecasting</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-center space-y-3">
                <Button
                  onClick={onCreateWorkspace}
                  className="w-full sm:w-auto px-8 py-3 text-base font-medium"
                  size="lg"
                >
                  Create Workspace Now
                </Button>
                <p className="text-xs text-[var(--text-muted)]">
                  Takes less than 2 minutes • Start your journey
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
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
    return <FullScreenLoading />
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
    const onboardingSteps = [
      { label: 'Welcome', description: 'Get started' },
      { label: 'Workspace', description: 'Create order' },
      { label: 'Accounts', description: 'Add structure' },
      { label: 'Transactions', description: 'Start tracking' }
    ]

    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <ProgressIndicator currentStep={1} totalSteps={4} steps={onboardingSteps} />

          <Card className="w-full max-w-2xl mx-auto p-8 text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent-primary)] to-[#F4B76D] rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-[#1C1917] font-bold text-2xl font-space-grotesk">F</span>
                </div>
                <h1 className="text-4xl font-bold text-[var(--text-primary)] font-space-grotesk">
                  Welcome to Forma
                </h1>
                <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto">
                  Your journey to financial clarity starts here. Let's set up your workspace in just a few steps.
                </p>
              </div>

              {/* Journey Philosophy */}
              <div className="bg-[var(--bg-glass)] rounded-xl p-6 border border-[var(--border-glass)]">
                <p className="text-sm text-[var(--text-secondary)] italic">
                  "First create order (workspace), then structure (accounts), then track (transactions), then see the future (forecast)"
                </p>
              </div>

              <div className="grid gap-6 text-left">
                <div className="flex items-start gap-4 p-4 bg-[var(--bg-glass)] rounded-xl border border-[var(--border-glass)] hover:border-[var(--accent-primary)]/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-lg">1. Create Your Workspace</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Set up a shared space where your family can collaborate on financial goals and track expenses together. This is your foundation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[var(--bg-glass)] rounded-xl border border-[var(--border-glass)] opacity-60">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-lg">2. Add Your Accounts</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Connect your bank accounts, credit cards, and cash to get a complete picture of your finances.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-[var(--bg-glass)] rounded-xl border border-[var(--border-glass)] opacity-60">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1 text-lg">3. Start Tracking</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Record transactions, plan future expenses, and watch your financial clarity emerge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto px-8 py-3 text-base font-medium"
                  size="lg"
                >
                  Create Your Workspace
                </Button>
                <p className="text-xs text-[var(--text-muted)]">
                  Takes less than 2 minutes • Free forever
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Remove the create-workspace step since we're using the modal now
  if (step === 'create-workspace') {
    // This should not happen anymore, but just in case
    return <FullScreenLoading />
  }

  if (step === 'complete') {
    const onboardingSteps = [
      { label: 'Welcome', description: 'Get started' },
      { label: 'Workspace', description: 'Create order' },
      { label: 'Accounts', description: 'Add structure' },
      { label: 'Transactions', description: 'Start tracking' }
    ]

    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Progress Indicator - showing completion */}
          <ProgressIndicator currentStep={2} totalSteps={4} steps={onboardingSteps} />

          <Card className="w-full max-w-md mx-auto p-8 text-center">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-[var(--accent-success)]/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[var(--accent-success)]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)] font-space-grotesk">
                  {hasSkipped ? 'Welcome to Forma!' : 'Workspace Created!'}
                </h2>
                <p className="text-[var(--text-secondary)]">
                  {hasSkipped 
                    ? 'You can create a workspace anytime from your settings'
                    : 'Great start! Next, add your accounts to begin tracking.'
                  }
                </p>
              </div>

              {!hasSkipped && (
                <div className="bg-[var(--bg-glass)] rounded-xl p-4 border border-[var(--border-glass)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">Next step:</strong> Add your first account (bank, credit card, or cash) to start tracking transactions.
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                <LoadingSpinner size="md" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return null
}