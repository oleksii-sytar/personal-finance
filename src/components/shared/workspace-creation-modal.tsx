'use client'

import { createPortal } from 'react-dom'
import { Suspense } from 'react'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { LazyWorkspaceCreationForm } from '@/components/forms/lazy'
import { FormLoadingSkeleton } from '@/components/shared/form-loading-skeleton'

/**
 * Global workspace creation modal that can be triggered from anywhere
 * Uses portal to render above all other content
 */
export function WorkspaceCreationModal() {
  const { isCreateModalOpen, closeCreateModal } = useWorkspaceModal()
  const { refreshWorkspaces } = useWorkspace()

  if (!isCreateModalOpen || typeof window === 'undefined') {
    return null
  }

  const handleSuccess = async () => {
    // Refresh workspaces to include the new one
    await refreshWorkspaces()
    closeCreateModal()
  }

  const handleCancel = () => {
    closeCreateModal()
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <Suspense fallback={<FormLoadingSkeleton variant="workspace" />}>
        <LazyWorkspaceCreationForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Suspense>
    </div>,
    document.body
  )
}