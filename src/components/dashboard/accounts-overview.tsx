'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { AccountRow } from '@/components/accounts/account-row'
import { groupAccountsByClass } from '@/lib/money/balances'
import type { Account, CurrencyCode } from '@/types/domain'

interface AccountsOverviewProps {
  accounts: Account[]
  displayCurrency: CurrencyCode
}

export function AccountsOverview({ accounts, displayCurrency }: AccountsOverviewProps) {
  const { assets, liabilities } = groupAccountsByClass(accounts)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>Рахунки</CardTitle>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-[var(--accent-primary)] hover:underline"
        >
          Керувати <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="min-w-0">
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">Активи</p>
          <div className="space-y-0.5">
            {assets.map((a) => (
              <AccountRow key={a.id} account={a} displayCurrency={displayCurrency} href={`/accounts/${a.id}`} />
            ))}
            {assets.length === 0 && <p className="px-3 py-2 text-sm text-muted">Активів ще немає</p>}
          </div>
        </section>

        <section className="min-w-0">
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">Зобов’язання</p>
          <div className="space-y-0.5">
            {liabilities.map((a) => (
              <AccountRow key={a.id} account={a} displayCurrency={displayCurrency} href={`/accounts/${a.id}`} />
            ))}
            {liabilities.length === 0 && <p className="px-3 py-2 text-sm text-muted">Без боргів</p>}
          </div>
        </section>
      </div>
    </Card>
  )
}