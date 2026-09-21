'use client'

import { useQuickAdd } from '@/contexts/quick-add-context'
import { QuickEntrySheet } from '@/components/transactions/quick-entry-sheet'

/** Mounts the quick-entry sheet once, wired to the global QuickAdd context. */
export function GlobalQuickAdd() {
  const { open, closeQuickAdd, preselectAccountId } = useQuickAdd()
  return open ? <QuickEntrySheet open onClose={closeQuickAdd} preselectAccountId={preselectAccountId} /> : null
}