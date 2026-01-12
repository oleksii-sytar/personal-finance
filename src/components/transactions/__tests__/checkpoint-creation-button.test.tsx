import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CheckpointCreationButton } from '../checkpoint-creation-button'

// Mock the CheckpointCreationModal
vi.mock('../checkpoint-creation-modal', () => ({
  CheckpointCreationModal: vi.fn(({ isOpen, onClose, workspaceId, onCheckpointCreated }) => (
    isOpen ? (
      <div data-testid="checkpoint-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onCheckpointCreated}>Create Checkpoint</button>
        <span>Workspace: {workspaceId}</span>
      </div>
    ) : null
  ))
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}))

describe('CheckpointCreationButton', () => {
  const mockOnCheckpointCreated = vi.fn()
  const workspaceId = 'workspace-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders default variant button', () => {
    render(
      <CheckpointCreationButton
        workspaceId={workspaceId}
        onCheckpointCreated={mockOnCheckpointCreated}
      />
    )

    expect(screen.getByText('Add Checkpoint')).toBeInTheDocument()
  })

  it('renders compact variant button', () => {
    render(
      <CheckpointCreationButton
        workspaceId={workspaceId}
        onCheckpointCreated={mockOnCheckpointCreated}
        variant="compact"
      />
    )

    expect(screen.getByText('Add Checkpoint')).toBeInTheDocument()
  })

  it('opens modal when button is clicked', () => {
    render(
      <CheckpointCreationButton
        workspaceId={workspaceId}
        onCheckpointCreated={mockOnCheckpointCreated}
      />
    )

    const button = screen.getByText('Add Checkpoint')
    fireEvent.click(button)

    expect(screen.getByTestId('checkpoint-modal')).toBeInTheDocument()
    expect(screen.getByText('Workspace: workspace-1')).toBeInTheDocument()
  })

  it('closes modal when close is triggered', () => {
    render(
      <CheckpointCreationButton
        workspaceId={workspaceId}
        onCheckpointCreated={mockOnCheckpointCreated}
      />
    )

    // Open modal
    const button = screen.getByText('Add Checkpoint')
    fireEvent.click(button)

    expect(screen.getByTestId('checkpoint-modal')).toBeInTheDocument()

    // Close modal
    const closeButton = screen.getByText('Close Modal')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('checkpoint-modal')).not.toBeInTheDocument()
  })

  it('calls onCheckpointCreated when checkpoint is created', () => {
    render(
      <CheckpointCreationButton
        workspaceId={workspaceId}
        onCheckpointCreated={mockOnCheckpointCreated}
      />
    )

    // Open modal
    const button = screen.getByText('Add Checkpoint')
    fireEvent.click(button)

    // Create checkpoint
    const createButton = screen.getByText('Create Checkpoint')
    fireEvent.click(createButton)

    expect(mockOnCheckpointCreated).toHaveBeenCalled()
    expect(screen.queryByTestId('checkpoint-modal')).not.toBeInTheDocument()
  })
})