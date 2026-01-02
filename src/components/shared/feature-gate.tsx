'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Lock, Plus } from 'lucide-react'

interface FeatureGateProps {
  children: ReactNode
  featureName: string
  description: string
  requireWorkspace?: boolean
}

/**
 * FeatureGate component that restricts access to features based on workspace availability
 * Requirements: 4.5
 */
export function FeatureGate({ 
  children, 
  featureName, 
  description,
  requireWorkspace = true 
}: FeatureGateProps) {
  const { currentWorkspace, workspaces, loading } = useWorkspace()
  const { openCreateModal } = useWorkspaceModal()
  const router = useRouter()

  // Show loading while checking workspace status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D]"></div>
      </div>
    )
  }

  // If workspace is not required or user has a workspace, show the feature
  if (!requireWorkspace || (workspaces.length > 0 && currentWorkspace)) {
    return <>{children}</>
  }

  // Show access restriction notice
  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto p-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white/90">
              {featureName} Requires a Workspace
            </h2>
            <p className="text-white/60">
              {description}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-white/50">
              Create a workspace to unlock this feature and start collaborating with your family.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={openCreateModal}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}