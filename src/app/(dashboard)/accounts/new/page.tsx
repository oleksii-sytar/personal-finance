'use client'

import {useWorkspaceContext} from '@/contexts/workspace-context'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/Card'
import { AccountForm } from '@/components/accounts/account-form'

export default function NewAccountPage() {
  const {can}=useWorkspaceContext()
  if(!can('account.manage'))return <p role="status">Створення рахунків доступне власнику та фінансовому менеджеру сім’ї.</p>
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Рахунки
      </Link>
      <PageHeader title="Новий рахунок" subtitle="Готівка, картка, заощадження, криптовалюта, кредит або особистий борг" />
      <Card>
        <AccountForm />
      </Card>
    </div>
  )
}
