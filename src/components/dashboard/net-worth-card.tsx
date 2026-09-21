'use client'

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { netWorthSummary } from '@/lib/money/balances'
import {savingsTotal} from '@/lib/calculations/household'
import { formatMoney } from '@/lib/money/format'
import type { Account, CurrencyCode } from '@/types/domain'

interface NetWorthCardProps {
  accounts: Account[]
  displayCurrency: CurrencyCode
}

/** The family's standing at a glance — the north-star number. */
export function NetWorthCard({ accounts, displayCurrency }: NetWorthCardProps) {
  const { totalAssets, totalLiabilities, netWorth } = netWorthSummary(accounts, displayCurrency)
  const denom = totalAssets + totalLiabilities
  const assetPct = denom > 0 ? Math.round((totalAssets / denom) * 100) : 100

  return (
    <div className="min-w-0 max-w-full glass-card-elevated p-6 sm:p-8">
      <div className="flex items-center gap-2 text-sm text-secondary">
        <Wallet className="h-4 w-4 text-[var(--accent-primary)]" />
        Чисті активи сім’ї
      </div>
      <p className="mt-2 break-words font-space-grotesk text-3xl font-bold tabular-nums text-primary sm:text-4xl">
        {formatMoney(netWorth, displayCurrency)}
      </p>
      <p className="mt-1 text-xs text-muted">За внесеними рахунками · {displayCurrency}</p>

      <p className="mt-3 text-sm text-secondary">Відкладено на заощадження: <strong>{formatMoney(savingsTotal(accounts,displayCurrency),displayCurrency)}</strong></p>
      {/* Asset / debt proportion bar */}
      <div className="mt-6 flex h-2 overflow-hidden rounded-pill bg-[var(--bg-glass-interactive)]">
        <div className="h-full bg-[var(--accent-success)]" style={{ width: `${assetPct}%` }} />
        <div className="h-full bg-[var(--accent-error)]" style={{ width: `${100 - assetPct}%` }} />
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--accent-success)]" />
            Усього активів
          </div>
          <p className="mt-0.5 break-words text-lg font-semibold tabular-nums text-[var(--accent-success)]">
            {formatMoney(totalAssets, displayCurrency)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <TrendingDown className="h-3.5 w-3.5 text-[var(--accent-error)]" />
            Усього боргів
          </div>
          <p className="mt-0.5 break-words text-lg font-semibold tabular-nums text-[var(--accent-error)]">
            {formatMoney(totalLiabilities, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  )
}