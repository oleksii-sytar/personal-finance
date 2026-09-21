'use client'

import Link from 'next/link'
import {OwnerResources} from '@/components/accounts/owner-resources'
import { Plus, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { AccountCard } from '@/components/accounts/account-card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useWorkspaceContext } from '@/contexts/workspace-context'
import { useAccounts, useTransactions } from '@/hooks/use-finance'
import { groupAccountsByClass, netWorthSummary } from '@/lib/money/balances'
import { formatMoney } from '@/lib/money/format'
import {accountVerificationStatus} from '@/lib/reconciliation/model'

export default function AccountsPage() {
  const { displayCurrency, can, members } = useWorkspaceContext()
  const { data: accounts = [], isLoading, isFetching:accountsFetching, error:accountsError, refetch:reloadAccounts } = useAccounts()
  const { data: transactions, isFetching:transactionsFetching, error:transactionsError, refetch:reloadTransactions } = useTransactions()
  const verificationDataState=accountsError||transactionsError?'error':accountsFetching||transactionsFetching?'loading':'ready'

  const { assets, liabilities } = groupAccountsByClass(accounts)
  const summary = netWorthSummary(accounts, displayCurrency)

  const addButton = can('account.manage') ? (
    <Link href="/accounts/new" className="collection-add">
      <Button variant="primary">
        <Plus className="mr-1.5 h-4 w-4" /> Додати рахунок
      </Button>
    </Link>
  ) : undefined

  if (isLoading) {
    return (
      <>
        <PageHeader title="Рахунки" subtitle="Усі кошти та борги сім’ї" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      </>
    )
  }

  if(accountsError&&!accounts.length)return <><PageHeader title="Рахунки"/><p role="alert">Не вдалося завантажити рахунки.</p><Button variant="secondary" onClick={()=>reloadAccounts()}>Спробувати ще раз</Button></>

  return (
    <>
      <header className="collection-heading"><div><h1>Рахунки</h1><p>Усі кошти та борги сім’ї</p></div>{addButton}</header>

      {verificationDataState==='error'&&<div className="mb-4 flex flex-wrap items-center gap-2"><p role="alert" className="text-sm text-secondary">Не вдалося оновити статуси звірки.</p><Button variant="secondary" size="sm" onClick={()=>{void reloadAccounts();void reloadTransactions()}}>Спробувати ще раз</Button></div>}
      <dl className="position-summary" aria-label="Підсумки рахунків">
        <div><dt>Активи</dt><dd className="money-good">{formatMoney(summary.totalAssets,displayCurrency)}</dd></div>
        <div><dt>Борги</dt><dd className="money-bad">{formatMoney(summary.totalLiabilities,displayCurrency)}</dd></div>
        <div className="position-net"><dt>Чисті активи</dt><dd>{formatMoney(summary.netWorth,displayCurrency)}</dd></div>
      </dl>

      <OwnerResources accounts={accounts} members={members} currency={displayCurrency}/>
      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Рахунків ще немає"
          description="Додайте готівку, картки, заощадження та борги, щоб бачити фінанси всієї сім’ї."
          action={addButton}
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-space-grotesk text-sm font-semibold uppercase tracking-wide text-muted">
              Активи · {assets.length}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((a) => (
                <AccountCard key={a.id} account={a} displayCurrency={displayCurrency} verification={accountVerificationStatus(a,transactions,verificationDataState)} />
              ))}
            </div>
          </section>

          {liabilities.length > 0 && (
            <section>
              <h2 className="mb-3 font-space-grotesk text-sm font-semibold uppercase tracking-wide text-muted">
                Зобов’язання · {liabilities.length}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {liabilities.map((a) => (
                  <AccountCard key={a.id} account={a} displayCurrency={displayCurrency} verification={accountVerificationStatus(a,transactions,verificationDataState)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}