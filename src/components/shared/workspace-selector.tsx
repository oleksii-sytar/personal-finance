'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Settings, Check } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { WorkspaceCreationForm } from '@/components/forms/workspace-creation-form'
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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  const { 
    currentWorkspace, 
    workspaces, 
    loading, 
    switchWorkspace 
  } = useWorkspace()

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
    setIsOpen(false)
    setShowCreateForm(true)
  }

  const handleWorkspaceCreated = () => {
    setShowCreateForm(false)
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-white/5 rounded-lg"></div>
      </div>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className={className}>
        <button
          onClick={handleCreateWorkspace}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
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
          className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200 group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-[#1C1917] font-semibold text-xs">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white/90 font-medium truncate">
              {currentWorkspace.name}
            </span>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-white/50 group-hover:text-white/70 transition-all duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#2A1D15] border border-white/10 rounded-xl shadow-xl backdrop-blur-md z-50">
            <div className="p-2">
              {/* Current Workspaces */}
              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-white/70 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-[#1C1917] font-semibold text-xs">
                          {workspace.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium truncate">
                        {workspace.name}
                      </span>
                    </div>
                    {workspace.id === currentWorkspace.id && (
                      <Check className="w-4 h-4 text-[#E6A65D]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-white/10"></div>

              {/* Actions */}
              <div className="space-y-1">
                <button
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Create New Workspace
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/settings')
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white/90 hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  Workspace Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <WorkspaceCreationForm
            onSuccess={handleWorkspaceCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}
    </>
  )
}