'use client'

import {isLoanDestination} from '@/lib/loans/destination'
import { useState } from 'react'
import Link from 'next/link'
import {BalanceHistory} from '@/components/accounts/balance-history'
import {accountVerificationStatus} from '@/lib/reconciliation/model'
import {AccountOwner} from '@/components/accounts/account-owner'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Archive, Scale, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { AccountTypeIcon, AccountTypeBadge } from '@/components/accounts/account-visuals'
import { UpdateBalanceDialog } from '@/components/accounts/update-balance-dialog'
import { DeleteAccountDialog } from '@/components/accounts/delete-account-dialog'
import { TransactionHistory } from '@/components/transactions/transaction-history'
import { localDay } from '@/lib/calculations/liquidity'
import { useWorkspaceContext } from '@/contexts/workspace-context'
import { useQuickAdd } from '@/contexts/quick-add-context'
import { useAccount, useAccounts, useCategories, useTransactions } from '@/hooks/use-finance'
import { reconciliationStatus, creditCardSummary } from '@/lib/money/balances'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/money/format'
import { Receipt } from 'lucide-react'

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { can } = useWorkspaceContext()
  const { openQuickAdd } = useQuickAdd()
  const { data: account, isLoading, isFetching:accountFetching, error:accountError, refetch:reloadAccount } = useAccount(id)
  const {data:accounts=[]}=useAccounts()
  const { data: transactions, isFetching:transactionsFetching, error:transactionsError, refetch:reloadTransactions } = useTransactions({ accountId: id })
  const verificationDataState=accountError||transactionsError?'error':accountFetching||transactionsFetching?'loading':'ready'
  const { data: categories = [] } = useCategories()

  const [showReconcile, setShowReconcile] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) return <SkeletonCard lines={4} />
  if(accountError&&!account)return <><p role="alert">Не вдалося завантажити рахунок.</p><Button variant="secondary" onClick={()=>reloadAccount()}>Спробувати ще раз</Button></>
  if (!account) {
    return <EmptyState icon={Receipt} title="Рахунок не знайдено" action={<Link href="/accounts"><Button variant="secondary">До рахунків</Button></Link>} />
  }

  const status = reconciliationStatus(account, transactions??[])
  const cc = account.type === 'credit_card' ? creditCardSummary(account) : null
  const verification=accountVerificationStatus(account,transactions,verificationDataState)
  const today=localDay()
  const historyUrl='/transactions?'+new URLSearchParams({account:id,to:today}).toString()
  const plansUrl='/transactions?'+new URLSearchParams({account:id,view:'planned'}).toString()

  return (
    <div>
      <Link href="/accounts" className="mb-4 inline-flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Рахунки
      </Link>

      <PageHeader
        title={account.name}
        action={
          can('account.manage') ? (
            <>
              <Link href={`/accounts/${account.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Pencil className="mr-1.5 h-4 w-4" /> Редагувати
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
                <Archive className="mr-1.5 h-4 w-4" /> Архівувати
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Balance + reconciliation */}
        <Card variant="elevated" className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <AccountTypeIcon type={account.type} size="lg" />
            <div>
              <AccountTypeBadge type={account.type} />
              {account.isDefault && <Badge tone="accent" className="ml-2">Основний</Badge>}
            </div>
          </div>

          {cc ? (
            <div className="mt-4">
              <p className={cn("break-words font-space-grotesk text-3xl font-bold tabular-nums sm:text-4xl", cc.used > 0 ? "text-[var(--accent-error)]" : "text-primary")}>
                {formatMoney(account.currentBalance, account.currency)}
              </p>
              <p className="text-xs text-muted">{cc.used>0?'Борг за кредиткою':'Власні кошти'} · {account.currency}</p>
              <div className="mt-4 rounded-xl bg-[var(--bg-glass-interactive)] p-3"><p className="text-xs text-secondary">Доступно до використання</p><p className="mt-1 break-words text-2xl font-semibold tabular-nums">{formatMoney(cc.available,account.currency)}</p><p className="mt-1 text-xs text-muted">Власні кошти + доступний кредит</p></div>
              {cc.overLimit > 0 && <p className="mt-2 text-sm text-[var(--accent-error)]">Перевищення ліміту: {formatMoney(cc.overLimit,account.currency)}. Доступний кредит: 0.</p>}
              {cc.limit > 0 && (
                <div className="mt-3 h-2 overflow-hidden rounded-pill bg-[var(--bg-glass-interactive)]">
                  <div
                    className="h-full rounded-pill"
                    style={{
                      width: `${Math.round(cc.utilization * 100)}%`,
                      backgroundColor:
                        cc.utilization >= 0.8
                          ? 'var(--accent-error)'
                          : cc.utilization >= 0.5
                            ? 'var(--accent-warning)'
                            : 'var(--accent-success)',
                    }}
                  />
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted">Використано</p>
                  <p className="font-medium tabular-nums text-[var(--accent-error)]">{formatMoney(cc.used, account.currency)}</p>
                </div>
                <div>
                  <p className="text-muted">Кредитний ліміт</p>
                  <p className="font-medium tabular-nums text-primary">{cc.limitKnown ? formatMoney(cc.limit, account.currency) : 'Не вказано'}</p>
                </div>
                <div>
                  <p className="text-muted">Власні кошти</p>
                  <p className="font-medium tabular-nums text-[var(--accent-success)]">{formatMoney(cc.ownFunds, account.currency)}</p>
                </div>
                <div><p className="text-muted">Доступний кредит</p><p className="break-words font-medium tabular-nums">{formatMoney(cc.availableCredit,account.currency)}</p></div>
              </div>
            </div>
          ) : (
            <>
              <p
                className={cn(
                  'mt-4 font-space-grotesk text-4xl font-bold tabular-nums',
                  account.currentBalance < 0 ? 'text-[var(--accent-error)]' : 'text-primary'
                )}
              >
                {formatMoney(account.currentBalance, account.currency)}
              </p>
              <p className="text-xs text-muted">Поточний залишок · {account.currency}</p>
            </>
          )}

          <div className="mt-5 border-t border-primary pt-4 text-sm">
            <Badge tone={verification.tone} data-verification-state={verification.state}>{verification.label}</Badge>
            {verification.pendingCount!==null&&verification.pendingCount>0&&<Link className="flex min-h-11 items-center underline" href={'/transactions?account='+id+'&pending=1'}>Показати незвірені транзакції ({verification.pendingCount})</Link>}
            {verification.state==='pending'&&account.lastReconciledAt&&<p className="mt-2 text-xs text-muted">Остання звірка: {new Date(account.lastReconciledAt).toLocaleDateString('uk-UA',{timeZone:'Europe/Kyiv'})}</p>}
            {verification.state==='error'&&<Button className="mt-2" variant="secondary" size="sm" onClick={()=>{void reloadAccount();void reloadTransactions()}}>Оновити статус</Button>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => isLoanDestination(account)?router.push('/transactions?newLoan='+account.id):openQuickAdd(account.id)}>
              <Plus className="mr-1.5 h-4 w-4" /> Додати транзакцію
            </Button>
            {can('reconcile') && (
              <Button variant={verification.confirmed ? 'ghost' : 'primary'} size="sm" disabled={verification.pendingCount===null} onClick={() => setShowReconcile(true)}>
                <Scale className="mr-1.5 h-4 w-4" /> Звірити залишок
              </Button>
            )}
          </div>
        </Card>

        {/* Meta */}
        <Card>
          <CardTitle className="mb-3">Деталі</CardTitle><AccountOwner account={account}/>{['bank_loan','mortgage','microloan','credit_card'].includes(account.type)&&<Link className="my-4 inline-flex min-h-11 items-center text-[var(--accent-primary)] underline" href={'/loans?account='+account.id}>Платежі та деталі кредиту</Link>}
          <dl className="space-y-2 text-sm">
            {account.institution && <Row label="Фінансова установа" value={account.institution} />}
            {account.counterparty && <Row label="Контрагент" value={account.counterparty} />}
            {account.principal != null && <Row label="Тіло кредиту" value={formatMoney(account.principal, account.currency)} />}
            {account.creditLimit != null && <Row label="Кредитний ліміт" value={formatMoney(account.creditLimit, account.currency)} />}
            {account.interestRate != null && <Row label="Відсотки" value={`${account.interestRate}%`} />}
            {account.dueDate && <Row label="Строк оплати" value={new Date(account.dueDate).toLocaleDateString('uk-UA')} />}
            <Row label="Без підтвердження залишку" value={verification.pendingCount===null?'Немає даних':String(verification.pendingCount)} />
          </dl>
        </Card>

        {/* Actual history and planned commitments have separate destinations. */}
        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Останні транзакції</CardTitle>
          {!transactions||transactionsError ? (
            <p role={transactionsError?'alert':'status'} className="px-1 py-4 text-sm text-muted">{transactionsError?'Не вдалося завантажити транзакції.':'Завантажуємо транзакції…'}</p>
          ) : (
            <TransactionHistory transactions={transactions} accounts={[account,...accounts.filter(a=>a.id!==account.id)]} categories={categories} accountId={id} limit={12} through={today} onSelect={t=>router.push(historyUrl+'&ids='+encodeURIComponent(t.id))}/>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary pt-3 text-sm">
            <Link className="inline-flex min-h-11 items-center text-[var(--accent-primary)] hover:underline" href={historyUrl}>Усі виконані</Link>
            <Link className="inline-flex min-h-11 items-center text-[var(--accent-primary)] hover:underline" href={plansUrl}>Плани рахунку</Link>
          </div>
        </Card>

        {/* Balance history */}
        <Card>
          <CardTitle className="mb-3">Історія залишків</CardTitle>
          <BalanceHistory account={account}/>
        </Card>
      </div>

      <UpdateBalanceDialog
        account={account}
        calculated={status.calculatedBalance}
        open={showReconcile}
        onClose={() => setShowReconcile(false)}
      />
      <DeleteAccountDialog
        account={account}
        transactionCount={transactions?.length??0}
        open={showDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  )
}
