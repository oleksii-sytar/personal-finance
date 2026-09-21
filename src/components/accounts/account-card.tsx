import Link from 'next/link'
import type {AccountVerificationStatus} from '@/lib/reconciliation/model'
import {AccountOwner} from '@/components/accounts/account-owner'
import { AccountTypeIcon } from '@/components/accounts/account-visuals'
import { Badge } from '@/components/ui/badge'
import { ACCOUNT_TYPE_META } from '@/lib/constants/accounts'
import { formatMoney } from '@/lib/money/format'
import { convert } from '@/lib/money/fx'
import { creditCardSummary } from '@/lib/money/balances'
import { cn } from '@/lib/utils'
import type { Account, CurrencyCode } from '@/types/domain'

interface AccountCardProps {
  account: Account
  displayCurrency: CurrencyCode
  verification: AccountVerificationStatus
}

function utilizationColor(util: number): string {
  if (util >= 0.8) return 'var(--accent-error)'
  if (util >= 0.5) return 'var(--accent-warning)'
  return 'var(--accent-success)'
}

export function AccountCard({ account, displayCurrency, verification }: AccountCardProps) {
  const meta = ACCOUNT_TYPE_META[account.type]
  const negative = account.currentBalance < 0
  const showConversion = account.currency !== displayCurrency
  const isCredit = account.type === 'credit_card'

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="glass-card flex flex-col gap-4 p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AccountTypeIcon type={account.type} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium text-primary">{account.name}</p>
            <p className="text-xs text-muted">{meta.label}</p><AccountOwner account={account}/>
          </div>
        </div>
        {account.isDefault && <Badge tone="accent">Основний</Badge>}
      </div>

      {isCredit ? (
        <CreditCardBody account={account} />
      ) : (
        <div>
          <p
            className={cn(
              'font-space-grotesk text-2xl font-bold tabular-nums',
              negative ? 'text-[var(--accent-error)]' : 'text-primary'
            )}
          >
            {formatMoney(account.currentBalance, account.currency)}
          </p>
          {showConversion && (
            <p className="text-xs text-muted tabular-nums">
              ≈ {formatMoney(convert(account.currentBalance, account.currency, displayCurrency), displayCurrency)}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted">
          {account.institution || account.counterparty || ' '}
        </span>
        <Badge tone={verification.tone} className="max-w-full break-words" data-verification-state={verification.state}>{verification.label}</Badge>
      </div>
    </Link>
  )
}

function CreditCardBody({ account }: { account: Account }) {
  const { limit, limitKnown, used, ownFunds, available, overLimit, utilization } = creditCardSummary(account)
  return (
    <div className="space-y-2">
      <div>
        <p className={cn("break-words font-space-grotesk text-2xl font-bold tabular-nums", used > 0 ? "text-[var(--accent-error)]" : "text-primary")}>
          {formatMoney(account.currentBalance, account.currency)}
        </p>
        <p className="text-xs text-muted">{used>0?'Борг за кредиткою':'Власні кошти на кредитці'}</p>
        <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-secondary"><span>Доступно до використання</span><strong className="break-words text-sm tabular-nums text-primary">{formatMoney(available,account.currency)}</strong></p>
        {overLimit > 0 && <p className="mt-1 text-xs text-[var(--accent-error)]">Перевищення ліміту: {formatMoney(overLimit,account.currency)}</p>}
      </div>
      {limit > 0 && (
        <div className="h-1.5 overflow-hidden rounded-pill bg-[var(--bg-glass-interactive)]">
          <div
            className="h-full rounded-pill"
            style={{ width: `${Math.round(utilization * 100)}%`, backgroundColor: utilizationColor(utilization) }}
          />
        </div>
      )}
      <p className="text-xs text-secondary">
        {used > 0 ? (
          <>
            <span className="text-[var(--accent-error)]">{formatMoney(used, account.currency)}</span> використано з{' '}
            {limitKnown ? formatMoney(limit, account.currency) : 'невідомого ліміту'}
          </>
        ) : (
          <>{limitKnown ? 'Ліміт ' + formatMoney(limit, account.currency) : 'Ліміт не вказано'}</>
        )}
        {ownFunds > 0 && (
          <>
            {' · '}
            <span className="text-[var(--accent-success)]">+{formatMoney(ownFunds, account.currency)} власні кошти</span>
          </>
        )}
      </p>
    </div>
  )
}