vi.mock('@/contexts/workspace-context',()=>({useWorkspaceContext:()=>({can:()=>true})}))
import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {DetailedEntryForm} from '@/components/transactions/detailed-entry-form'
import type {Transaction} from '@/types/domain'
const mocks=vi.hoisted(()=>({save:vi.fn().mockResolvedValue({}),error:vi.fn(),success:vi.fn()}))
vi.mock('@/components/ui/dialog',()=>({
 Dialog:({open,children,footer}:{open:boolean;children:React.ReactNode;footer:React.ReactNode})=>open?<div role="dialog">{children}{footer}</div>:null,
 DialogActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
}))
vi.mock('@/components/transactions/transfer-dialog',()=>({TransferDialog:()=>null}))
vi.mock('@/components/ui/toast',()=>({useToast:()=>({success:mocks.success,error:mocks.error})}))
vi.mock('@/hooks/use-loans',()=>({useLoanData:()=>({data:{profiles:[
 {account_id:'loan',balance_basis:'principal',schedule_basis:'bank'},
 {account_id:'loan-other',balance_basis:'principal',schedule_basis:'bank'},
],rows:[
 {id:'installment',account_id:'loan',payment_date:'2026-09-10',principal:5277.86,fees:3781,interest:.73,insurance:null,other:null,payment_total:9059.59,status:'historical'},
 {id:'other-installment',account_id:'loan-other',payment_date:'2026-09-03',principal:5000,fees:4000,interest:null,insurance:null,other:null,payment_total:9000,status:'scheduled'},
]}})}))
vi.mock('@/hooks/use-finance',()=>({
 useMembers:()=>({data:[]}),useTransactions:()=>({data:[]}),
 useAccounts:()=>({data:[
  {id:'source',name:'Cash source',type:'bank_debit',currency:'UAH',isDefault:true},
  {id:'other',name:'Other source',type:'bank_debit',currency:'UAH'},
  {id:'foreign',name:'Foreign source',type:'bank_debit',currency:'USD'},
  {id:'loan',name:'Loan itself',type:'bank_loan',currency:'UAH'},
  {id:'loan-other',name:'Other loan',type:'bank_loan',currency:'UAH'},
 ]}),
 useCategories:()=>({data:[{id:'first',name:'Обслуговування кредитів',type:'expense'},{id:'second',name:'Продукти',type:'expense'}]}),
 useCreateTransaction:()=>({isPending:false,mutateAsync:vi.fn()}),
 useUpdateTransaction:()=>({isPending:false,mutateAsync:mocks.save}),
 useDeleteTransaction:()=>({isPending:false,mutateAsync:vi.fn()}),
 useSaveRecurring:()=>({isPending:false,mutateAsync:vi.fn()}),
}))
const transaction={
 id:'payment',accountId:'source',categoryId:'first',kind:'expense',amount:9060,currency:'UAH',
 description:'Loan payment',notes:'Existing detailed payment notes. '.repeat(30),transactionDate:'2026-09-03',status:'completed',
 updatedAt:'2026-09-14T10:00:00Z',loanAccountId:'loan',loanInstallmentId:'installment',
 loanPrincipal:5277.86,loanBasis:'confirmed',loanComponents:{fees:3781,interest:.73},
 counterAccountId:null,counterAmount:null,
} as Transaction
afterEach(()=>{cleanup();vi.clearAllMocks()})
function open(){render(<DetailedEntryForm open onClose={vi.fn()} transaction={transaction}/>)}
function choose(value:string){fireEvent.change(screen.getByLabelText('Категорія або кредит'),{target:{value}})}
function confirm(){fireEvent.click(screen.getByRole('checkbox',{name:'Підтверджую фінансові зміни'}))}
function submit(){fireEvent.submit(screen.getByLabelText('Категорія або кредит').closest('form')!)}
describe('explicit loan payment destination',()=>{
 it('shows the actual loan as destination and keeps normal fields enabled',()=>{
  open()
  expect((screen.getByLabelText('Категорія або кредит') as HTMLSelectElement).value).toBe('loan:loan')
  for(const label of ['Категорія або кредит','Рахунок','Дата'])expect((screen.getByLabelText(label) as HTMLInputElement).disabled).toBe(false)
  expect((screen.getByLabelText(/Сума/) as HTMLInputElement).disabled).toBe(false)
  expect((screen.getByRole('button',{name:'Зберегти'}) as HTMLButtonElement).disabled).toBe(false)
  expect([...(screen.getByLabelText('Рахунок') as HTMLSelectElement).options].map(o=>o.value)).toEqual(['source','other'])
 })
 it('changing to groceries removes all loan fields, but keeps the single expense and notes',async()=>{
  open();choose('second')
  expect(screen.getByText(/Зв’язок із кредитом буде прибрано/)).toBeTruthy()
  expect(screen.queryByLabelText('Платіж за графіком')).toBeNull()
  confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{
   categoryId:'second',kind:'expense',amount:9060,notes:transaction.notes?.trim(),expectedUpdatedAt:transaction.updatedAt,
   loanAccountId:null,loanInstallmentId:null,loanPrincipal:0,loanComponents:{},loanBasis:null,confirmedFinancialEdit:true,
  }})
 })
 it('moving the source keeps the loan allocation untouched',async()=>{
  open();fireEvent.change(screen.getByLabelText('Рахунок'),{target:{value:'other'}});confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({accountId:'other',amount:9060,confirmedFinancialEdit:true})
  expect(mocks.save.mock.calls[0][0].patch).not.toHaveProperty('loanAccountId')
 })
 it('does not invent a new principal allocation for a smaller payment',async()=>{
  open();fireEvent.change(screen.getByLabelText(/Сума/),{target:{value:'100'}});submit()
  expect(await screen.findByText(/Сума менша за внесені складові/)).toBeTruthy()
  expect(mocks.save).not.toHaveBeenCalled()
 })
 it('never carries the old allocation into a different loan',async()=>{
  open();choose('loan:loan-other');submit()
  expect(await screen.findByText(/Оберіть платіж графіка або вкажіть суму/)).toBeTruthy()
  expect(mocks.save).not.toHaveBeenCalled()
 })
 it('retargets the existing operation using the selected new schedule, not the old split',async()=>{
  open();choose('loan:loan-other')
  fireEvent.change(screen.getByLabelText('Платіж за графіком'),{target:{value:'other-installment'}})
  confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0]).toMatchObject({id:'payment',patch:{amount:9060,loanAccountId:'loan-other',loanInstallmentId:'other-installment',loanPrincipal:5000,loanComponents:{fees:4000},loanBasis:'confirmed'}})
 })
 it('saves an edited date without replacing the loan allocation',async()=>{
  open();fireEvent.change(screen.getByLabelText('Дата'),{target:{value:'2026-09-04'}});confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).toMatchObject({transactionDate:'2026-09-04',confirmedFinancialEdit:true})
  expect(mocks.save.mock.calls[0][0].patch).not.toHaveProperty('loanPrincipal')
 })
 it('allows decimal entry and explicit zero principal without closing the fields',async()=>{
  open();fireEvent.click(screen.getByText('Розподіл платежу'))
  const field=screen.getByLabelText('На погашення боргу') as HTMLInputElement
  fireEvent.change(field,{target:{value:'5277,'}});expect(field.value).toBe('5277,')
  fireEvent.change(field,{target:{value:'5277,86'}});expect(field.value).toBe('5277,86')
  fireEvent.change(field,{target:{value:'0'}});expect(field.value).toBe('0')
  confirm();submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch.loanPrincipal).toBe(0)
 })
 it('restoring the original destination before saving is a no-op for the loan',async()=>{
  open();choose('second');choose('loan:loan');submit()
  await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce())
  expect(mocks.save.mock.calls[0][0].patch).not.toHaveProperty('loanAccountId')
 })
})