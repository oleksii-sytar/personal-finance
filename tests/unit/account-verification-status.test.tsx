import {beforeEach,describe,it,expect,vi} from 'vitest'
import {render,screen,within,fireEvent} from '@testing-library/react'
import {accountVerificationStatus} from '@/lib/reconciliation/model'
import AccountsPage from '@/app/(dashboard)/accounts/page'
import AccountDetailPage from '@/app/(dashboard)/accounts/[id]/page'
import type {Account,Transaction} from '@/types/domain'
import {makeAccount,makeTxn} from './_factories'
const state=vi.hoisted(()=>({accounts:[] as Account[],transactions:[] as Transaction[]|undefined,fetching:false,error:null as Error|null,reload:vi.fn(),navigate:vi.fn()}))
vi.mock('@/hooks/use-finance',()=>({
 useAccounts:()=>({data:state.accounts,isLoading:false,isFetching:false,refetch:state.reload}),
 useAccount:()=>({data:state.accounts[0],isLoading:false,isFetching:false,refetch:state.reload}),
 useTransactions:()=>({data:state.transactions,isFetching:state.fetching,error:state.error,refetch:state.reload}),
 useCategories:()=>({data:[]}),
}))
vi.mock('@/hooks/use-daily-spending',()=>({useDailySpending:()=>({statuses:new Map(),transactions:state.transactions||[],isLoading:false,isError:false})}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({displayCurrency:'UAH',can:()=>true})}))
vi.mock('@/contexts/quick-add-context',()=>({useQuickAdd:()=>({openQuickAdd:vi.fn()})}))
vi.mock('next/navigation',()=>({useParams:()=>({id:'a'}),useRouter:()=>({push:state.navigate})}))
vi.mock('@/components/accounts/account-owner',()=>({AccountOwner:()=>null}))
vi.mock('@/components/accounts/balance-history',()=>({BalanceHistory:()=>null}))
vi.mock('@/components/accounts/delete-account-dialog',()=>({DeleteAccountDialog:()=>null}))
vi.mock('@/components/accounts/update-balance-dialog',()=>({UpdateBalanceDialog:({open}:{open:boolean})=>open?<div role="dialog">Звірка відкрита</div>:null}))
const stamp='2026-09-15T11:00:00Z'
const source=()=>makeAccount({id:'a',name:'Укрсиббанк UAH',lastReconciledAt:'2026-09-12T10:00:00Z'})
const incoming=()=>makeTxn({accountId:'mono',counterAccountId:'a',kind:'transfer',accountVerifiedAt:stamp})
beforeEach(()=>{state.accounts=[source()];state.transactions=[];state.fetching=false;state.error=null;vi.clearAllMocks()})
describe('One account verification status across all screens',()=>{
 it('does not mistake an old confirmation date for confirmed new transactions',()=>{
  expect(accountVerificationStatus(source(),[incoming()])).toMatchObject({confirmed:false,pendingCount:1,label:'Не звірено: 1 транзакція',tone:'warning'})
 })
 it('uses the counter-account confirmation independently of the source',()=>{
  expect(accountVerificationStatus(source(),[{...incoming(),counterVerifiedAt:stamp}])).toMatchObject({confirmed:true,pendingCount:0})
 })
 it('preserves a manual debt confirmation after a linked expense',()=>{
  const loan=makeAccount({id:'loan',lastReconciledAt:stamp,type:'mortgage'})
  expect(accountVerificationStatus(loan,[makeTxn({accountId:'a',loanAccountId:'loan',accountVerifiedAt:stamp})]).pendingCount).toBe(0)
 })
 it('ignores planned, deleted and unrelated transactions',()=>{
  const tx=incoming();expect(accountVerificationStatus(source(),[{...tx,status:'planned'},{...tx,deletedAt:stamp},makeTxn({accountId:'other'})]).confirmed).toBe(true)
 })
 it('does not imply verification for an account that was never confirmed',()=>{
  expect(accountVerificationStatus({...source(),lastReconciledAt:null},[])).toMatchObject({state:'unverified',confirmed:false})
 })
 it.each([['loading',undefined],['error',[]]] as const)('never displays green with %s data',(dataState,transactions)=>{
  expect(accountVerificationStatus(source(),transactions?[]:undefined,dataState)).toMatchObject({confirmed:false,pendingCount:null,tone:'neutral'})
 })
 it('does not report cached confirmations as current during a refetch',()=>{
  expect(accountVerificationStatus(source(),[],'loading').confirmed).toBe(false)
 })
 it.each([[2,'транзакції'],[5,'транзакцій'],[11,'транзакцій'],[21,'транзакція']])('labels %s pending transactions clearly',(count,word)=>{
  const rows=Array.from({length:Number(count)},incoming);expect(accountVerificationStatus(source(),rows).label).toBe('Не звірено: '+count+' '+word)
 })
 it('passes current transaction confirmation state into cards',()=>{
  state.transactions=[incoming(),makeTxn({accountId:'a',kind:'transfer',counterAccountId:'usd',counterVerifiedAt:stamp})]
  render(<AccountsPage/>);const card=screen.getByRole('link',{name:/Укрсиббанк UAH/})
  expect(within(card).getByText('Не звірено: 2 транзакції')).toHaveAttribute('data-verification-state','pending')
  expect(within(card).queryByText(/Підтверджено/)).toBeNull()
 })
 it('updates cards when all account legs are confirmed',()=>{
  state.transactions=[incoming()];const view=render(<AccountsPage/>);expect(screen.getByText('Не звірено: 1 транзакція')).toBeVisible()
  state.transactions=[{...incoming(),counterVerifiedAt:stamp}];view.rerender(<AccountsPage/>);expect(screen.getByText('Підтверджено 12.09.2026')).toHaveAttribute('data-verification-state','verified')
 })
 it('shows unknown instead of a green card when loading or failing',()=>{
  state.transactions=undefined;const view=render(<AccountsPage/>);expect(screen.getByText('Перевіряємо статус…')).toBeVisible()
  state.error=new Error('network');view.rerender(<AccountsPage/>);expect(screen.getByText('Статус звірки недоступний')).toBeVisible();expect(screen.queryByText(/Підтверджено/)).toBeNull()
 })
 it('shows the same state in account details with a scoped pending-transactions link',()=>{
  state.transactions=[incoming()];render(<AccountDetailPage/>)
  expect(screen.getByText('Не звірено: 1 транзакція')).toBeVisible()
  expect(screen.getByRole('link',{name:'Показати незвірені транзакції (1)'})).toHaveAttribute('href','/transactions?account=a&pending=1')
  fireEvent.click(screen.getByRole('button',{name:'Звірити залишок'}));expect(screen.getByRole('dialog')).toBeVisible()
 })
 it('does not allow confirmation against missing ledger data',()=>{
  state.transactions=undefined;render(<AccountDetailPage/>);expect(screen.getByRole('button',{name:'Звірити залишок'})).toBeDisabled()
  expect(screen.queryByRole('link',{name:/Показати незвірені/})).toBeNull();expect(screen.queryByText(/Підтверджено/)).toBeNull()
 })
 it('does not claim a zero pending count after a transaction-load failure',()=>{
  state.error=new Error('network');render(<AccountDetailPage/>);expect(screen.getByText('Статус звірки недоступний')).toBeVisible()
  expect(screen.getByText('Немає даних')).toBeVisible();expect(screen.getByRole('button',{name:'Звірити залишок'})).toBeDisabled()
 })
})


describe('Account detail uses actual history without losing its plans',()=>{
 it('shows twelve latest completed transactions and links to matching history or separate plans',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-15T12:00:00Z'))
  try{
   state.transactions=[...Array.from({length:20},(_,i)=>makeTxn({id:'future-'+i,accountId:'a',description:'Майбутній план '+i,status:'planned',transactionDate:'2026-12-25'})),...Array.from({length:15},(_,i)=>makeTxn({id:'done-'+i,accountId:'a',description:'Факт '+i,transactionDate:'2026-09-'+String(i+1).padStart(2,'0')}))]
   render(<AccountDetailPage/>)
   const rows=screen.getAllByRole('button',{name:/^Факт /})
   expect(rows).toHaveLength(12);expect(rows[0]).toHaveTextContent('Факт 14')
   expect(screen.queryByText('Заплановано')).toBeNull()
   expect(screen.getByText('Сьогодні')).toBeInTheDocument()
   expect(screen.getByRole('link',{name:'Усі виконані'})).toHaveAttribute('href','/transactions?account=a&to=2026-09-15')
   expect(screen.getByRole('link',{name:'Плани рахунку'})).toHaveAttribute('href','/transactions?account=a&view=planned')
   fireEvent.click(rows[0]);expect(state.navigate).toHaveBeenCalledWith('/transactions?account=a&to=2026-09-15&ids=done-14')
   expect(state.transactions.filter(t=>t.status==='planned')).toHaveLength(20)
  }finally{vi.useRealTimers()}
 })
 it('keeps plans accessible when the account has no completed transactions',()=>{
  state.transactions=[makeTxn({accountId:'a',status:'planned',description:'Майбутня оренда',transactionDate:'2026-12-25'})]
  render(<AccountDetailPage/>)
  expect(screen.getByText('Виконаних транзакцій ще немає.')).toBeInTheDocument()
  expect(screen.getByRole('link',{name:'Плани рахунку'})).toHaveAttribute('href','/transactions?account=a&view=planned')
  expect(screen.queryByText('Майбутня оренда')).toBeNull()
 })
})