'use client'

import { useMemo } from 'react'
import {useDailySpending} from '@/hooks/use-daily-spending'
import {CompletePlanButton} from './complete-plan-button'
import type {SpendingMembership} from '@/lib/calculations/spending-membership'
import { Checkbox } from '@/components/ui/checkbox'
import { TransactionRow } from '@/components/transactions/transaction-row'
import type { Account, Category, Transaction } from '@/types/domain'

interface TransactionListProps {
  spendingStatuses?:Map<string,SpendingMembership>
  spendingPurpose?:'forecast'|'reserve'
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  onSelect?: (t: Transaction) => void
  selectedIds?: Set<string>
  onToggle?: (id:string,checked:boolean)=>void
}

function sectionLabel(date: string): string {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return "Сьогодні"
  if (diff === 1) return "Завтра"
  if (diff === -1) return "Учора"
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

/** Date-grouped ledger. */
export function TransactionList({ transactions, accounts, categories, onSelect, selectedIds, onToggle,spendingStatuses,spendingPurpose='forecast' }: TransactionListProps) {
  const spending=useDailySpending(spendingPurpose)
  const statuses=spendingStatuses||(spending.isLoading||spending.isError?undefined:spending.statuses)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name
  const categoryName = (id?: string | null) => categories.find((c) => c.id === id)?.name

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const key = t.transactionDate
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    const plannedOnly=transactions.length>0&&transactions.every(t=>t.status==='planned')
    return Array.from(map.entries()).sort((a,b)=>plannedOnly?a[0].localeCompare(b[0]):b[0].localeCompare(a[0])).map(([date,rows])=>[date,plannedOnly?[...rows].sort((a,b)=>(a.plannedTime||'').localeCompare(b.plannedTime||'')):rows] as [string,Transaction[]])
  }, [transactions])

  return (
    <div className="space-y-5">
      {groups.map(([date, rows]) => (
        <div key={date}>
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">{sectionLabel(date)}</p>
          <div className="space-y-0.5">
            {rows.map((t) => (
              <div key={t.id} className={onToggle?'ledger-selection-row':'min-w-0'}>
              {onToggle && <Checkbox className="ledger-selection-checkbox justify-center" aria-label={'Обрати '+t.description+' '+t.transactionDate} checked={selectedIds?.has(t.id)||false} onChange={e=>onToggle(t.id,e.target.checked)}/>}
              <div className="min-w-0 flex-1"><TransactionRow
                transaction={t}
                spending={statuses?.get(t.id)}
                spendingPurpose={spendingPurpose}
                accountName={accountName(t.accountId)}
                loanAccountName={t.loanAccountId?accountName(t.loanAccountId):undefined}
                counterAccountName={t.counterAccountId?accountName(t.counterAccountId):undefined}
                categoryName={categoryName(t.categoryId)}
                onSelect={onSelect}
              />{onSelect&&t.status==='planned'&&<div className="flex justify-end px-3 pb-3"><CompletePlanButton transaction={t}/></div>}</div></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
