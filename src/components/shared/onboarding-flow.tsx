'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceCreationForm } from '@/components/forms/workspace-creation-form'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

/**
 * OnboardingFlow component for guiding new users through workspace creation
 * Requirements: 4.1, 4.5
 */
export function OnboardingFlow() {
  const [step, setStep] = useState<'loading' | 'welcome' | 'create-workspace' | 'complete'>('loading')
  const [hasSkipped, setHasSkipped] = useState(false)
  
  const { user } = useAuth()
  const { workspaces, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  // Check if user needs onboarding
  useEffect(() => {
    if (!workspaceLoading && user) {
      if (workspaces.length > 0) {
        // User already has workspaces, redirect to dashboard
        router.push('/dashboard')
      } else {
        // Show welcome step
        setStep('welcome')
      }
    }
  }, [user, workspaces, workspaceLoading, router])

  const handleGetStarted = () => {
    setStep('create-workspace')
  }

  const handleWorkspaceCreated = () => {
    setStep('complete')
    // Redirect to dashboard after a brief success message
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const handleSkip = () => {
    setHasSkipped(true)
    setStep('complete')
    // Redirect to dashboard with limited access
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  if (step === 'loading' || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto p-8 text-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-text-primary">
                Welcome to Forma
              </h1>
              <p className="text-lg text-text-secondary">
                Your family's financial management starts here
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent-primary text-sm font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Create a Workspace</h3>
                  <p className="text-sm text-text-secondary">
                    Set up a shared space for your family's finances
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent-primary text-sm font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Track Transactions</h3>
                  <p className="text-sm text-text-secondary">
                    Record income, expenses, and transfers with ease
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent-primary text-sm font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">Invite Family</h3>
                  <p className="text-sm text-text-secondary">
                    Collaborate with family members on financial goals
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleGetStarted}
                className="w-full bg-gradient-to-r from-accent-primary to-accent-primary/90 text-bg-primary font-medium py-3 px-6 rounded-full hover:shadow-lg hover:shadow-accent-primary/25 transition-all duration-200"
              >
                Get Started
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'create-workspace') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WorkspaceCreationForm
          onSuccess={handleWorkspaceCreated}
          onSkip={handleSkip}
          showSkipOption={true}
        />
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto p-8 text-center">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-success"
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
              <h2 className="text-2xl font-semibold text-text-primary">
                {hasSkipped ? 'Welcome to Forma!' : 'Workspace Created!'}
              </h2>
              <p className="text-text-secondary">
                {hasSkipped 
                  ? 'You can create a workspace anytime from your settings'
                  : 'Your workspace is ready. Redirecting to dashboard...'
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