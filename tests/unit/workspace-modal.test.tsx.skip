import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkspaceModalProvider, useWorkspaceModal } from '@/contexts/workspace-modal-context'

// Test component to interact with the modal context
function TestComponent() {
  const { isCreateModalOpen, openCreateModal, closeCreateModal } = useWorkspaceModal()
  
  return (
    <div>
      <div data-testid="modal-state">
        {isCreateModalOpen ? 'open' : 'closed'}
      </div>
      <button onClick={openCreateModal} data-testid="open-button">
        Open Modal
      </button>
      <button onClick={closeCreateModal} data-testid="close-button">
        Close Modal
      </button>
    </div>
  )
}

describe('WorkspaceModal Context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide modal state and controls', () => {
    render(
      <WorkspaceModalProvider>
        <TestComponent />
      </WorkspaceModalProvider>
    )

    // Modal should be closed initially
    expect(screen.getByTestId('modal-state')).toHaveTextContent('closed')
  })

  it('should open modal when openCreateModal is called', () => {
    render(
      <WorkspaceModalProvider>
        <TestComponent />
      </WorkspaceModalProvider>
    )

    // Click open button
    fireEvent.click(screen.getByTestId('open-button'))

    // Modal should be open
    expect(screen.getByTestId('modal-state')).toHaveTextContent('open')
  })

  it('should close modal when closeCreateModal is called', () => {
    render(
      <WorkspaceModalProvider>
        <TestComponent />
      </WorkspaceModalProvider>
    )

    // Open modal first
    fireEvent.click(screen.getByTestId('open-button'))
    expect(screen.getByTestId('modal-state')).toHaveTextContent('open')

    // Close modal
    fireEvent.click(screen.getByTestId('close-button'))
    expect(screen.getByTestId('modal-state')).toHaveTextContent('closed')
  })

  it('should throw error when used outside provider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useWorkspaceModal must be used within a WorkspaceModalProvider')

    consoleSpy.mockRestore()
  })
})