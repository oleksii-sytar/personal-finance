import {describe,it,expect,vi,beforeEach} from 'vitest'
import {fireEvent,render,screen} from '@testing-library/react'
import {SegmentedControl} from '@/components/ui/segmented'
import {StatementImportPrompt} from '@/components/settings/statement-import-prompt'
import {LoanOverview} from '@/components/loans/loan-dashboard'
import TransactionsPage from '@/app/(dashboard)/transactions/page'
import {pageTransactions} from '@/lib/data/ledger-filter'
import {makeAccount,makeTxn} from './_factories'
import type {LoanInstallment} from '@/lib/loans/model'

const state=vi.hoisted(()=>({params:new URLSearchParams(),replace:vi.fn(),accounts:[] as ReturnType<typeof makeAccount>[],transactions:[] as ReturnType<typeof makeTxn>[]}))
vi.mock('next/navigation',()=>({useRouter:()=>({replace:state.replace}),useSearchParams:()=>state.params}))
vi.mock('@/hooks/use-daily-spending',()=>({useDailySpending:()=>({statuses:new Map(),transactions:state.transactions,isLoading:false,isError:false})}))
vi.mock('@/hooks/use-finance',()=>({useCurrentUser:()=>({data:{id:'owner'}}),useTransactions:()=>({data:state.transactions}),useUpdateTransaction:()=>({isPending:false,mutateAsync:vi.fn()}),useAccounts:()=>({data:state.accounts,isLoading:false}),useTransactionPages:(filter:any)=>({data:{pages:[pageTransactions(state.transactions,filter)]},isLoading:false}),useSelectTransactions:()=>({isPending:false,mutateAsync:vi.fn()}),useRecurring:()=>({data:[]}),useCategories:()=>({data:[]}),useMembers:()=>({data:[]})}))
vi.mock('@/hooks/use-loans',()=>({useLoanData:()=>({data:{profiles:[],rows:[]},isLoading:false})}))
vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({role:'owner',displayCurrency:'UAH',can:()=>true})}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:vi.fn(),error:vi.fn()})}))
vi.mock('@/components/transactions/detailed-entry-form',()=>({DetailedEntryForm:()=>null}))
vi.mock('@/components/transactions/import-dialog',()=>({ImportDialog:()=>null}))
vi.mock('@/components/transactions/bulk-action-dialog',()=>({BulkActionDialog:()=>null}))
beforeEach(()=>{state.params=new URLSearchParams();state.replace.mockClear();state.accounts=[makeAccount({id:'bank',name:'Bank'})];state.transactions=[]})
describe('Mobile UI feedback',()=>{
 it('keeps the tab count separate from its label',()=>{
  const change=vi.fn()
  render(<SegmentedControl value="all" onChange={change} options={[{value:'all',label:'Виконані'},{value:'review',label:'Перевірити',count:8}]}/>)
  const tab=screen.getByRole('tab',{name:'Перевірити 8'})
  expect(tab.querySelector('.segmented-label')).toHaveTextContent('Перевірити')
  expect(tab.querySelector('.segmented-count')).toHaveTextContent('8')
  fireEvent.click(tab);expect(change).toHaveBeenCalledWith('review')
 })
 it('renders the embedded prompt without nested glass panels and keeps the full prompt',()=>{
  const {container}=render(<StatementImportPrompt embedded/>)
  expect(container.querySelector('.glass-card')).toBeNull()
  expect((screen.getByLabelText('Промпт для конвертації виписки') as HTMLTextAreaElement).value).toContain('Date;Description;Amount')
  expect(screen.getByRole('button',{name:'Копіювати промпт'})).toBeVisible()
 })
 it('keeps the standalone prompt card',()=>{
  const {container}=render(<StatementImportPrompt/>)
  expect(container.querySelector('.glass-card')).not.toBeNull()
 })
 it('resets the review tab, URL filters, selection, search and date/type filters',()=>{
  state.params=new URLSearchParams('account=bank&view=review&batch=import&ids=review&pending=1')
  state.transactions=[makeTxn({id:'review',accountId:'bank',description:'Review record',importBatchId:'import',clearedStatus:'uncleared'}),makeTxn({id:'other',accountId:'other-bank',description:'Other completed',categoryId:'food'}),makeTxn({id:'plan',status:'planned',description:'Future plan'})]
  render(<TransactionsPage/>)
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Review'}})
  fireEvent.click(screen.getByRole('button',{name:'Фільтри транзакцій'}))
  fireEvent.change(screen.getByLabelText('Тип транзакції'),{target:{value:'income'}})
  fireEvent.change(screen.getByLabelText('Від дати'),{target:{value:'2026-09-01'}})
  fireEvent.click(screen.getByRole('button',{name:'Скинути',exact:true}))
  expect(state.replace).toHaveBeenCalledWith('/transactions',{scroll:false})
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('tab',{name:'Виконані'})).toHaveAttribute('aria-selected','true')
  expect(screen.getByRole('searchbox')).toHaveValue('')
  expect(screen.getByText('Other completed')).toBeVisible()
  expect(screen.getByText('Review record')).toBeVisible()
  expect(screen.queryByText('Future plan')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Фільтри транзакцій'}))
  expect(screen.getByLabelText('Рахунок')).toHaveValue('')
  expect(screen.getByLabelText('Тип транзакції')).toHaveValue('all')
  expect(screen.getByLabelText('Від дати')).toHaveValue('')
 })
})
describe('Loan overview navigation',()=>{
 const base={members:[],profiles:[],rows:[],transactions:[],currency:'UAH' as const}
 it('shows all loans and cards as links, not an automatically selected editor',()=>{
  render(<LoanOverview {...base} accounts={[makeAccount({id:'loan',name:'Mortgage',type:'mortgage',currentBalance:-2000}),makeAccount({id:'card',name:'Credit card',type:'credit_card',currentBalance:-1000,creditLimit:5000}),makeAccount({id:'cash',name:'Cash',type:'cash',currentBalance:100})]}/>)
  expect(screen.getByRole('link',{name:'Відкрити кредит: Mortgage'})).toHaveAttribute('href','/loans/loan')
  expect(screen.getByRole('link',{name:'Відкрити кредит: Credit card'})).toHaveAttribute('href','/loans/card')
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('link',{name:/Cash/})).not.toBeInTheDocument()
 })
 it('does not show archived loans',()=>{
  render(<LoanOverview {...base} accounts={[makeAccount({name:'Archived',type:'bank_loan',archivedAt:'2026-09-01'})]}/>)
  expect(screen.getByText('Кредитів поки немає')).toBeVisible()
  expect(screen.queryByRole('link',{name:/Archived/})).not.toBeInTheDocument()
 })
 it('shows schedule rows only on the relevant loan and excludes completed payments',()=>{
  const row=(id:string,date:string):LoanInstallment=>({id,workspace_id:'ws',account_id:'loan',import_id:'import',sequence:1,payment_date:date,principal:100,interest:10,fees:0,insurance:0,other:0,payment_total:110,principal_balance_after:null,source_page:null,status:'scheduled',created_at:'2026-09-01'})
  render(<LoanOverview {...base} accounts={[makeAccount({id:'loan',name:'Loan',type:'bank_loan',currentBalance:-200})]} rows={[row('paid','2026-09-10'),row('next','2026-10-10')]} transactions={[makeTxn({loanInstallmentId:'paid'})]}/>)
  expect(screen.getByText('10 жовтня 2026 р.')).toBeVisible()
  expect(screen.queryByText('10 вересня 2026 р.')).not.toBeInTheDocument()
 })
})