'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { AccountForm } from '@/components/accounts/account-form'
import { useAccount } from '@/hooks/use-finance'

export default function EditAccountPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: account, isLoading } = useAccount(params.id)

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/accounts/${params.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Назад
      </Link>
      <PageHeader title="Редагувати рахунок" />
      <Card>
        {isLoading || !account ? (
          <SkeletonCard lines={4} />
        ) : (
          <AccountForm account={account} onDone={() => router.push(`/accounts/${account.id}`)} />
        )}
      </Card>
    </div>
  )
}