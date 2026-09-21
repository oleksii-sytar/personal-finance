'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useArchiveAccount } from '@/hooks/use-finance'
import type { Account } from '@/types/domain'

interface DeleteAccountDialogProps {
  account: Account
  transactionCount: number
  open: boolean
  onClose: () => void
}

export function DeleteAccountDialog({ account, transactionCount, open, onClose }: DeleteAccountDialogProps) {
  const archive = useArchiveAccount()
  const toast = useToast()
  const router = useRouter()

  async function confirm() {
    try {
      await archive.mutateAsync(account.id)
      toast.success("Рахунок архівовано", account.name)
      onClose()
      router.push('/accounts')
    } catch (error) {
      toast.error("Не вдалося архівувати рахунок",error)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Архівувати ${account.name}?`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Залишити рахунок
          </Button>
          <Button variant="primary" onClick={confirm} disabled={archive.isPending}>
            {archive.isPending && <Spinner className="mr-2" />}
            Архівувати
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-warning)]" />
        <div className="text-sm text-secondary">
          {transactionCount > 0 ? (
            <p>
              Кількість операцій на рахунку: <strong className="text-primary">{transactionCount}</strong> . Архівування приховає рахунок, але збереже історію операцій.
            </p>
          ) : (
            <p>На цьому рахунку немає операцій. Архівування прибере його зі списку активних рахунків.</p>
          )}
        </div>
      </div>
    </Dialog>
  )
}