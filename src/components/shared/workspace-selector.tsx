'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Settings, Check } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { useWorkspaceModal } from '@/contexts/workspace-modal-context'
import type { Workspace } from '@/lib/supabase/types'

interface WorkspaceSelectorProps {
  className?: string
}

/**
 * WorkspaceSelector dropdown component for switching between workspaces
 * Requirements: 6.1, 6.2, 6.3
 */
export function WorkspaceSelector({ className = '' }: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  const { 
    currentWorkspace, 
    workspaces, 
    loading, 
    switchWorkspace 
  } = useWorkspace()
  
  const { openCreateModal } = useWorkspaceModal()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    if (workspace.id !== currentWorkspace?.id) {
      await switchWorkspace(workspace.id)
    }
    setIsOpen(false)
  }

  const handleCreateWorkspace = () => {
    console.log('Create workspace button clicked')
    setIsOpen(false)
    openCreateModal()
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-glass-interactive rounded-lg"></div>
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className={className}>
        <button
          onClick={handleCreateWorkspace}
          className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-glass-interactive rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Workspace
        </button>
      </div>
    )
  }

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm bg-glass-interactive hover:bg-glass-elevated border border-primary rounded-lg transition-all group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-inverse font-semibold text-xs">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-primary font-medium truncate">
              {currentWorkspace.name}
            </span>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-muted group-hover:text-secondary transition-all ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-secondary border border-primary rounded-xl executive-shadow backdrop-blur-md z-50">
            <div className="p-2">
              {/* Current Workspaces */}
              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-glass-interactive rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-inverse font-semibold text-xs">
                          {workspace.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium truncate">
                        {workspace.name}
                      </span>
                    </div>
                    {workspace.id === currentWorkspace.id && (
                      <Check className="w-4 h-4 text-accent" />
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-primary"></div>

              {/* Actions */}
              <div className="space-y-1">
                <button
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-glass-interactive rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create New Workspace
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/settings')
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-glass-interactive rounded-lg transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Workspace Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}