'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface WorkspaceModalContextType {
  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void
}

const WorkspaceModalContext = createContext<WorkspaceModalContextType | undefined>(undefined)

interface WorkspaceModalProviderProps {
  children: ReactNode
}

/**
 * Global workspace modal context for unified workspace creation
 * Allows any component to trigger workspace creation modal
 */
export function WorkspaceModalProvider({ children }: WorkspaceModalProviderProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const openCreateModal = () => {
    console.log('Opening workspace creation modal')
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    console.log('Closing workspace creation modal')
    setIsCreateModalOpen(false)
  }

  return (
    <WorkspaceModalContext.Provider
      value={{
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
      }}
    >
      {children}
    </WorkspaceModalContext.Provider>
  )
}

export function useWorkspaceModal() {
  const context = useContext(WorkspaceModalContext)
  if (context === undefined) {
    throw new Error('useWorkspaceModal must be used within a WorkspaceModalProvider')
  }
  return context
}