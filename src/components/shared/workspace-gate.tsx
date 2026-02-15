'use client'

/**
 * WorkspaceGate Component
 * 
 * Conditionally renders children based on workspace existence.
 * Shows workspace creation prompt if no workspace exists.
 * 
 * Requirements: AC 2.1.1 - User without workspace sees workspace creation prompt on ALL pages except settings
 */

import { type ReactNode } from 'react'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Wallet, Users, TrendingUp } from 'lucide-react'

interface WorkspaceGateProps {
  children: ReactNode
  featureName: string
  description: string
  benefits?: Array<{
    icon: ReactNode
    text: string
  }>
}

/**
 * Renders children only if workspace exists, otherwise shows creation prompt
 */
export function WorkspaceGate({ 
  children, 
  featureName,
  description,
  benefits
}: WorkspaceGateProps) {
  const { currentWorkspace, workspaces, loading } = useWorkspace()
  const { openCreateModal } = useWorkspaceModal()

  // Show loading state
  if (loading) {
    return (
      <div className="container py-6">
        <div className="text-center text-secondary">Loading...</div>
      </div>
    )
  }

  // Show workspace creation prompt if no workspaces
  if (workspaces.length === 0) {
    const defaultBenefits = benefits || [
      {
        icon: <Wallet className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
        text: 'Track your family\'s financial activities'
      },
      {
        icon: <TrendingUp className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
        text: 'Monitor balances and transaction history'
      },
      {
        icon: <Users className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
        text: 'Share access with family members'
      }
    ]

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-space-grotesk font-bold text-[var(--text-primary)] mb-2">
            {featureName}
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Create a workspace to start using {featureName.toLowerCase()}
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
                {description}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[var(--text-primary)] text-center mb-4">
                What you can do with {featureName.toLowerCase()}:
              </h3>
              
              <div className="grid gap-4">
                {defaultBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-[var(--bg-glass)] rounded-lg opacity-50">
                    {benefit.icon}
                    <span className="text-[var(--text-secondary)]">{benefit.text}</span>
                  </div>
                ))}
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
  
  // Workspace exists, render children
  return <>{children}</>
}
