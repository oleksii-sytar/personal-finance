'use client'

import { Plus } from 'lucide-react'
import { useQuickAdd } from '@/contexts/quick-add-context'

/** Desktop floating quick-add button (mobile uses the tab bar's centre button). */
export function QuickAddFab() {
  const { openQuickAdd } = useQuickAdd()
  return (
    <button
      type="button"
      onClick={() => openQuickAdd()}
      className="btn-primary fixed bottom-8 right-8 z-40 hidden h-14 items-center gap-2 rounded-pill px-6 shadow-[0_8px_24px_-6px_var(--shadow-elevated)] lg:inline-flex"
    >
      <Plus className="h-5 w-5" />
      Швидке додавання
    </button>
  )
}