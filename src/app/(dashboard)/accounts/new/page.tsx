'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/Card'
import { AccountForm } from '@/components/accounts/account-form'

export default function NewAccountPage() {
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