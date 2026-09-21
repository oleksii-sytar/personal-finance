vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({can:()=>true})}))
import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {DetailedEntryForm} from '@/components/transactions/detailed-entry-form'
import type {Transaction} from '@/types/domain'
const mocks=vi.hoisted(()=>({save:vi.fn().mockResolvedValue({}),error:vi.fn(),success:vi.fn(),create:vi.fn().mockResolvedValue({})}))
vi.mock('@/components/ui/dialog',()=>({
 Dialog:({open,children,footer}:{open:boolean;children:React.ReactNode;footer:React.ReactNode})=>open?<div role="dialog">{children}{footer}</div>:null,
 DialogActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
}))
vi.mock('@/components/transactions/transfer-dialog',()=>({TransferDialog:()=>null}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:mocks.success,error:mocks.error})}))
vi.mock('@/hooks/use-finance',()=>({
 useCurrentUser:()=>({data:{id:'u'}}),useMembers:()=>({data:[]}),useTransactions:()=>({data:[]}),
 useAccounts:()=>({data:[
  {id:'source',name:'Cash source',type:'bank_debit',currency:'UAH',isDefault:true},
  {id:'other',name:'Other source',type:'bank_debit',currency:'UAH'},
  {id:'foreign',name:'Foreign source',type:'bank_debit',currency:'USD'},
  {id:'11111111-1111-4111-8111-111111111111',name:'Loan itself',type:'bank_loan',currency:'UAH'},
  {id:'22222222-2222-4222-8222-222222222222',name:'Other loan',type:'bank_loan',currency:'UAH'},
 ]}),
 useCategories:()=>({data:[{id:'first',name:'Обслуговування кредитів',type:'expense'},{id:'second',name:'Продукти',type:'expense'}]}),
 useCreateTransaction:()=>({isPending:false,mutateAsync:mocks.create}),
 useUpdateTransaction:()=>({isPending:false,mutateAsync:mocks.save}),
 useDeleteTransaction:()=>({isPending:false,mutateAsync:vi.fn()}),
 useSaveRecurring:()=>({isPending:false,mutateAsync:vi.fn()}),
}))
const transaction={
 id:'payment',accountId:'source',categoryId:'first',kind:'expense',amount:9060,currency:'UAH',
 description:'Loan payment',notes:'Existing detailed payment notes. '.repeat(30),transactionDate:'2026-09-03',status:'completed',
 updatedAt:'2026-09-14T10:00:00Z',loanAccountId:'11111111-1111-4111-8111-111111111111',loanInstallmentId:'33333333-3333-4333-8333-333333333333',
 loanPrincipal:5277.86,loanBasis:'confirmed',loanComponents:{fees:3781,interest:.73},
 counterAccountId:null,counterAmount:null,
} as Transaction
vi.mock('@/hooks/use-daily-spending',()=>({useDailySpending:()=>({statuses:new Map(),transactions:[],isLoading:false,isError:false})}))

afterEach(()=>{cleanup();vi.clearAllMocks()})
const loanLabel='Кредит або борг (необов’язково)'
function open(value:Transaction=transaction){render(<DetailedEntryForm open onClose={vi.fn()} transaction={value}/>)}
function chooseLoan(value:string){fireEvent.change(screen.getByLabelText(loanLabel),{target:{value}})}
function confirm(){fireEvent.click(screen.getByRole('checkbox',{name:'Підтверджую фінансові зміни'}))}
function submit(){fireEvent.submit(screen.getByLabelText('Категорія').closest('form')!)}
describe('simple loan payment editing',()=>{
 it('shows an independent category and loan, with normal editable fields',()=>{
  open()
  expect(screen.getByLabelText('Категорія')).toHaveValue('first')
  expect(screen.getByLabelText(loanLabel)).toHaveValue('11111111-1111-4111-8111-111111111111')
  for(const label of ['Категорія',loanLabel,'Рахунок','Дата'])expect(screen.getByLabelText(label)).toBeEnabled()
  expect(screen.getByLabelText(/Сума/)).toBeEnabled()
  expect(screen.getByRole('button',{name:'Зберегти'})).toBeEnabled()
  expect([...(screen.getByLabelText('Рахунок') as HTMLSelectElement).options].map(o=>o.value)).toEqual(['source','other','foreign'])
  expect(screen.queryByLabelText('Платіж за графіком')).toBeNull()
  expect(screen.queryByLabelText('На погашення боргу')).toBeNull()
 })
 it('changes category without changing the loan, amount, notes or balance confirmation',async()=>{
  open();fireEvent.change(screen.getByLabelText('Категорія'),{target:{value:'second'}})
  expect(screen.queryByRole('checkbox',{name:'Підтверджую фінансові зміни'})).toBeNull()
  submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{
   categoryId:'second',kind:'expense',amount:9060,notes:transaction.notes?.trim(),
   loanAccountId:'11111111-1111-4111-8111-111111111111',loanInstallmentId:'33333333-3333-4333-8333-333333333333',expectedUpdatedAt:transaction.updatedAt,confirmedFinancialEdit:false,
  }})
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('explicitly detaches a loan without removing the expense or its category',async()=>{
  open();chooseLoan('')
  expect(screen.getByText(/Зв’язок із кредитом буде прибрано/)).toBeVisible()
  submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{kind:'expense',categoryId:'first',amount:9060,loanAccountId:null,loanInstallmentId:null,loanPrincipal:0,loanComponents:{},loanBasis:null}})
 })
 it('confirms a source-account change without requiring loan allocation',async()=>{
  open();fireEvent.change(screen.getByLabelText('Рахунок'),{target:{value:'other'}});confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({accountId:'other',loanAccountId:'11111111-1111-4111-8111-111111111111',loanInstallmentId:'33333333-3333-4333-8333-333333333333',amount:9060,confirmedFinancialEdit:true})
 })
 it('accepts a smaller payment after financial confirmation, independent of old principal',async()=>{
  open();fireEvent.change(screen.getByLabelText(/Сума/),{target:{value:'100'}});submit()
  expect(await screen.findByText('Підтвердьте фінансові зміни нижче.')).toBeVisible()
  expect(mocks.save).not.toHaveBeenCalled()
  confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({amount:100,loanAccountId:'11111111-1111-4111-8111-111111111111',confirmedFinancialEdit:true})
  expect(mocks.save.mock.calls[0][0].patch).not.toHaveProperty('loanPrincipal')
 })
 it('retargets the same expense without a schedule and clears obsolete allocations',async()=>{
  open();chooseLoan('22222222-2222-4222-8222-222222222222');submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{amount:9060,categoryId:'first',loanAccountId:'22222222-2222-4222-8222-222222222222',loanInstallmentId:null,loanPrincipal:0,loanComponents:{},loanBasis:null,confirmedFinancialEdit:false}})
 })
 it('saves an edited date with explicit financial confirmation',async()=>{
  open();fireEvent.change(screen.getByLabelText('Дата'),{target:{value:'2026-09-04'}});confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({transactionDate:'2026-09-04',loanAccountId:'11111111-1111-4111-8111-111111111111',confirmedFinancialEdit:true})
 })
 it('restores the original loan link without writing obsolete allocations',async()=>{
  open();chooseLoan('22222222-2222-4222-8222-222222222222');chooseLoan('11111111-1111-4111-8111-111111111111');submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({loanAccountId:'11111111-1111-4111-8111-111111111111',loanInstallmentId:'33333333-3333-4333-8333-333333333333'})
  expect(mocks.save.mock.calls[0][0].patch).not.toHaveProperty('loanPrincipal')
 })
 it('converts a loan-directed transfer into the same expense, never creating a second debit',async()=>{
  open({...transaction,kind:'transfer',loanAccountId:null,loanInstallmentId:null,counterAccountId:'11111111-1111-4111-8111-111111111111',counterAmount:9060})
  chooseLoan('11111111-1111-4111-8111-111111111111');confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{kind:'expense',accountId:'source',counterAccountId:null,counterAmount:null,amount:9060,loanAccountId:'11111111-1111-4111-8111-111111111111',confirmedFinancialEdit:true}})
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('creates an explicit loan plan without requiring a bank schedule',async()=>{
  render(<DetailedEntryForm open onClose={vi.fn()} initialValues={{loanAccountId:'11111111-1111-4111-8111-111111111111',accountId:'source',amount:'9060',status:'planned',transactionDate:'2026-10-25'}}/>)
  submit()
  await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce())
  expect(mocks.create.mock.calls[0][0]).toMatchObject({kind:'expense',amount:9060,status:'planned',transactionDate:'2026-10-25',loanAccountId:'11111111-1111-4111-8111-111111111111',loanInstallmentId:null,categoryId:'first'})
  expect(mocks.save).not.toHaveBeenCalled()
 })
})
