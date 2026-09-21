'use client'

import Link from 'next/link'
import {ArrowRight} from 'lucide-react'
import {Card,CardTitle} from '@/components/ui/Card'
import {TransactionHistory} from '@/components/transactions/transaction-history'
import {localDay} from '@/lib/calculations/liquidity'
import type {Account,Category,Transaction} from '@/types/domain'

interface RecentActivityProps {
 transactions:Transaction[]
 accounts:Account[]
 categories:Category[]
 onSelect?:(transaction:Transaction)=>void
}

export function RecentActivity({transactions,accounts,categories,onSelect}:RecentActivityProps){
 const today=localDay()
 return <Card>
  <div className="mb-3 flex items-center justify-between gap-3">
   <CardTitle>Останні транзакції</CardTitle>
   <Link href={'/transactions?to='+today} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-[var(--accent-primary)] hover:underline">Переглянути всі <ArrowRight className="h-3.5 w-3.5"/></Link>
  </div>
  <TransactionHistory transactions={transactions} accounts={accounts} categories={categories} limit={6} through={today} onSelect={onSelect}/>
 </Card>
}