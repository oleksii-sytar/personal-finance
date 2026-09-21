'use client'

import { createContext, useCallback, useContext, useState } from 'react'

interface QuickAddContextValue {
  open: boolean
  /** Optionally preselect an account when opening. */
  preselectAccountId?: string
  openQuickAdd: (accountId?: string) => void
  closeQuickAdd: () => void
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null)

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [preselectAccountId, setPreselect] = useState<string | undefined>(undefined)

  const openQuickAdd = useCallback((accountId?: string) => {
    setPreselect(accountId)
    setOpen(true)
  }, [])
  const closeQuickAdd = useCallback(() => setOpen(false), [])

  return (
    <QuickAddContext.Provider value={{ open, preselectAccountId, openQuickAdd, closeQuickAdd }}>
      {children}
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd(): QuickAddContextValue {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider')
  return ctx
}