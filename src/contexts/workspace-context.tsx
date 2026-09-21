'use client'

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { useCurrentUser, useMembers, useSettings, useWorkspace } from '@/hooks/use-finance'
import {exchangeRateVersion,subscribeExchangeRates} from '@/lib/money/fx'
import { can, type Permission } from '@/lib/auth/permissions'
import type { CurrencyCode, UserProfile, Workspace, WorkspaceMember, WorkspaceRole } from '@/types/domain'

interface WorkspaceContextValue {
  fxVersion: number
  workspace?: Workspace
  currentUser?: UserProfile
  members: WorkspaceMember[]
  role: WorkspaceRole
  /** Currency the current member prefers to read totals in. */
  displayCurrency: CurrencyCode
  isLoading: boolean
  can: (permission: Permission) => boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const fxVersion=useSyncExternalStore(subscribeExchangeRates,exchangeRateVersion,()=>0)
  const { data: workspace, isLoading: wsLoading } = useWorkspace()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { data: members = [], isLoading: membersLoading } = useMembers()
  const { data: settings, isLoading: settingsLoading } = useSettings()

  const value = useMemo<WorkspaceContextValue>(() => {
    const me = members.find((m) => m.userId === currentUser?.id)
    const role: WorkspaceRole = me?.role ?? 'viewer'
    return {
      fxVersion,
      workspace,
      currentUser,
      members,
      role,
      displayCurrency: settings?.displayCurrency ?? workspace?.currency ?? 'UAH',
      isLoading: wsLoading || userLoading || membersLoading || settingsLoading,
      can: (permission: Permission) => can(role, permission),
    }
  }, [fxVersion, workspace, currentUser, members, settings, wsLoading, userLoading, membersLoading, settingsLoading])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspaceContext must be used within WorkspaceProvider')
  return ctx
}