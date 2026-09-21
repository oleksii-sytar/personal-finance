import Link from 'next/link'
import {AccountOwner} from '@/components/accounts/account-owner'
import { ChevronRight } from 'lucide-react'
import { AccountTypeIcon } from '@/components/accounts/account-visuals'
import { formatMoney } from '@/lib/money/format'
import { convert } from '@/lib/money/fx'
import { cn } from '@/lib/utils'
import {creditCardSummary} from '@/lib/money/balances'
import type { Account, CurrencyCode } from '@/types/domain'

interface AccountRowProps {
  account: Account
  displayCurrency: CurrencyCode
  href?: string
}

/** Compact account line used on the dashboard and the accounts list. */
export function AccountRow({ account, displayCurrency, href }: AccountRowProps) {
  const negative = account.currentBalance < 0
  const card = account.type === 'credit_card' ? creditCardSummary(account) : null
  const converted = convert(account.currentBalance, account.currency, displayCurrency)
  const showConversion = account.currency !== displayCurrency
  const subtitle = account.institution || account.counterparty

  const body = (
    <>
      <div className="row-span-2 self-center sm:row-span-1"><AccountTypeIcon type={account.type} /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{account.name}</p>
        <AccountOwner account={account}/>{subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="col-start-2 row-start-2 min-w-0 text-left sm:col-start-3 sm:row-start-1 sm:max-w-[11rem] sm:text-right">
        <p
          className={cn(
            'break-words text-sm font-semibold tabular-nums',
            negative ? 'text-[var(--accent-error)]' : 'text-primary'
          )}
        >
          {formatMoney(account.currentBalance, account.currency)}
        </p>
        {card && <p className="text-xs text-muted">{card.used > 0 ? 'Борг' : 'Власні кошти'} · доступно {formatMoney(card.available,account.currency)}</p>}
        {showConversion && (
          <p className="text-xs text-muted tabular-nums">≈ {formatMoney(converted, displayCurrency)}</p>
        )}
      </div>
      {href && <ChevronRight className="col-start-3 row-span-2 row-start-1 h-4 w-4 shrink-0 text-muted sm:col-start-4 sm:row-span-1" />}
    </>
  )

  const className =
    'grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]'

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}