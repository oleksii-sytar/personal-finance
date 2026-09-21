'use client'

import {TransactionList} from '@/components/transactions/transaction-list'
import {recentTransactions} from '@/lib/data/ledger-filter'
import type {Account,Category,Transaction} from '@/types/domain'

interface TransactionHistoryProps {
 transactions:Transaction[]
 accounts:Account[]
 categories:Category[]
 accountId?:string
 limit?:number
 through?:string
 onSelect?:(transaction:Transaction)=>void
}

/** A bounded preview of actual history, never a preview of future commitments. */
export function TransactionHistory({transactions,accounts,categories,accountId,limit=12,through,onSelect}:TransactionHistoryProps){
 const recent=recentTransactions(transactions,{accountId,limit,through})
 if(!recent.length)return <p className="px-1 py-4 text-sm text-muted">Виконаних транзакцій ще немає.</p>
 return <TransactionList transactions={recent} accounts={accounts} categories={categories} onSelect={onSelect}/>
}
