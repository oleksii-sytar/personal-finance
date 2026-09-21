import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import {recentTransactions} from '@/lib/data/ledger-filter'
import {TransactionHistory} from '@/components/transactions/transaction-history'
import {RecentActivity} from '@/components/dashboard/recent-activity'
import {makeAccount,makeTxn} from './_factories'

const today='2026-09-15'
const actual=()=>Array.from({length:15},(_,i)=>makeTxn({id:'actual-'+i,accountId:'a',description:'Факт '+i,transactionDate:'2026-09-'+String(i+1).padStart(2,'0'),createdAt:'2026-09-10T12:00:00Z'}))
const future=()=>Array.from({length:30},(_,i)=>makeTxn({id:'plan-'+i,accountId:'a',description:'План '+i,status:'planned',transactionDate:'2026-12-25'}))
const mixed=()=>[...future(),makeTxn({id:'future-actual',accountId:'a',description:'Майбутня фактична',transactionDate:'2026-09-16'}),makeTxn({id:'deleted',accountId:'a',description:'Видалена фактична',transactionDate:today,deletedAt:today}),...actual()]
const accounts=[makeAccount({id:'a',name:'Основний рахунок'})]
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-15T12:00:00Z'))})
afterEach(()=>vi.useRealTimers())

describe('Shared actual-history selection',()=>{
 it('filters and orders before the preview limit, regardless of incoming order',()=>{
  const recent=recentTransactions(mixed(),{through:today,limit:12})
  expect(recent.map(t=>t.id)).toEqual(Array.from({length:12},(_,i)=>'actual-'+(14-i)))
 })
 it('keeps today but excludes future completed, planned, overdue planned and deleted rows',()=>{
  const rows=[...mixed(),makeTxn({id:'overdue-plan',status:'planned',transactionDate:'2026-09-01'})]
  const recent=recentTransactions(rows,{through:today,limit:100})
  expect(recent).toHaveLength(15);expect(recent[0].transactionDate).toBe(today)
  expect(recent.every(t=>t.status==='completed'&&!t.deletedAt&&t.transactionDate<=today)).toBe(true)
 })
 it('does not require bank reconciliation or category review to count a completed transaction as history',()=>{
  const unverified=makeTxn({transactionDate:today,reviewRequired:true,accountVerifiedAt:null,clearedStatus:'uncleared'})
  expect(recentTransactions([unverified],{through:today})).toEqual([unverified])
 })
 it('includes the source, destination and loan legs for the selected account',()=>{
  const rows=[makeTxn({id:'source',accountId:'a',transactionDate:today}),makeTxn({id:'received',accountId:'b',counterAccountId:'a',kind:'transfer',transactionDate:today}),makeTxn({id:'loan',accountId:'b',loanAccountId:'a',transactionDate:today}),makeTxn({id:'other',accountId:'b',transactionDate:today})]
  expect(new Set(recentTransactions(rows,{accountId:'a',through:today}).map(t=>t.id))).toEqual(new Set(['source','received','loan']))
 })
 it('uses creation time and ID as stable tie-breakers',()=>{
  const rows=[makeTxn({id:'a',transactionDate:today,createdAt:'2026-09-15T09:00:00Z'}),makeTxn({id:'b',transactionDate:today,createdAt:'2026-09-15T10:00:00Z'}),makeTxn({id:'c',transactionDate:today,createdAt:'2026-09-15T10:00:00Z'})]
  expect(recentTransactions(rows,{through:today}).map(t=>t.id)).toEqual(['c','b','a'])
 })
 it('does not mutate the snapshot used by plans, forecast or account verification',()=>{
  const input=mixed(),before=JSON.stringify(input)
  recentTransactions(input,{through:today})
  expect(JSON.stringify(input)).toBe(before);expect(input.filter(t=>t.status==='planned')).toHaveLength(30)
 })
 it('returns an empty history for an account containing only future plans',()=>{
  expect(recentTransactions(future(),{through:today})).toEqual([])
  expect(recentTransactions(actual(),{through:today,limit:0})).toEqual([])
 })
})

describe('History previews share the same actual-only rendering',()=>{
 it('shows dated, newest-first actual rows without plans in the twelve-row account preview',()=>{
  const select=vi.fn()
  render(<TransactionHistory transactions={mixed()} accounts={accounts} categories={[]} accountId="a" through={today} onSelect={select}/>)
  const buttons=screen.getAllByRole('button')
  expect(buttons).toHaveLength(12);expect(buttons[0]).toHaveTextContent('Факт 14')
  expect(screen.getByText('Сьогодні')).toBeInTheDocument()
  expect(screen.queryByText('Заплановано')).toBeNull()
  expect(screen.queryByText('Майбутня фактична')).toBeNull()
  fireEvent.click(buttons[0]);expect(select.mock.calls[0][0].id).toBe('actual-14')
 })
 it('applies the same rules to the six-row RecentActivity component',()=>{
  render(<RecentActivity transactions={mixed()} accounts={accounts} categories={[]}/>)
  const buttons=screen.getAllByRole('button')
  expect(buttons).toHaveLength(6);expect(buttons[0]).toHaveTextContent('Факт 14')
  expect(screen.queryByText('Заплановано')).toBeNull()
  expect(screen.getByRole('link',{name:'Переглянути всі'})).toHaveAttribute('href','/transactions?to='+today)
 })
 it('does not claim plans are executed when actual history is empty',()=>{
  render(<TransactionHistory transactions={future()} accounts={accounts} categories={[]} through={today}/>)
  expect(screen.getByText('Виконаних транзакцій ще немає.')).toBeInTheDocument()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
 })
})