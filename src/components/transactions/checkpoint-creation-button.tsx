'use client'

import { useState } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CheckpointCreationModal } from './checkpoint-creation-modal'
import { cn } from '@/lib/utils'

interface CheckpointCreationButtonProps {
  workspaceId: string
  onCheckpointCreated?: () => void
  className?: string
  variant?: 'default' | 'compact' | 'floating'
}

/**
 * CheckpointCreationButton component
 * Implements Requirements: 2.1
 * 
 * Features:
 * - Button to trigger checkpoint creation modal
 * - Handles modal open/close state
 * - Integrates with transaction page header
 */
export function CheckpointCreationButton({
  workspaceId,
  onCheckpointCreated,
  className,
  variant = 'default'
}: CheckpointCreationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleCheckpointCreated = () => {
    // Close modal and notify parent
    setIsModalOpen(false)
    if (onCheckpointCreated) {
      onCheckpointCreated()
    }
  }

  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={handleOpenModal}
          className={cn(
            `w-14 h-14 
            bg-gradient-to-br from-accent-secondary to-accent-secondary
            hover:from-accent-secondary hover:to-accent-primary
            text-inverse
            rounded-full
            shadow-lg hover:shadow-xl
            transition-all duration-200
            flex items-center justify-center
            hover:scale-105
            active:scale-95
            focus:outline-none focus:ring-2 focus:ring-accent-secondary/20 focus:ring-offset-2`,
            className
          )}
          aria-label="Add checkpoint"
          title="Add checkpoint"
        >
          <CheckCircle className="w-6 h-6" />
        </button>

        <CheckpointCreationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          workspaceId={workspaceId}
          onCheckpointCreated={handleCheckpointCreated}
        />
      </>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={handleOpenModal}
          variant="secondary"
          size="sm"
          className={cn('flex items-center gap-2', className)}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Add Checkpoint</span>
        </Button>

        <CheckpointCreationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          workspaceId={workspaceId}
          onCheckpointCreated={handleCheckpointCreated}
        />
      </>
    )
  }

  return (
    <>
      <Button
        onClick={handleOpenModal}
        className={cn('flex items-center gap-2', className)}
      >
        <Plus className="w-4 h-4" />
        Add Checkpoint
      </Button>

      <CheckpointCreationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        workspaceId={workspaceId}
        onCheckpointCreated={handleCheckpointCreated}
      />
    </>
  )
}