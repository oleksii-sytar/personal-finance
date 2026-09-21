import {describe,it,expect,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
import {transactionBalanceStatus,needsReview} from '@/lib/reconciliation/model'
import {TransactionRow} from '@/components/transactions/transaction-row'
import {makeTxn} from './_factories'
const stamp='2026-09-15T11:51:36Z'
const names={accountName:'Готівка',counterAccountName:'Монобанк',loanAccountName:'Іпотека'}
const transfer=()=>makeTxn({kind:'transfer',accountId:'cash',counterAccountId:'mono'})
describe('Account-specific balance confirmation',()=>{
 it('names the source when only incoming balance is confirmed',()=>{
  const t={...transfer(),counterVerifiedAt:stamp}
  expect(transactionBalanceStatus(t,names)).toMatchObject({verified:false,confirmed:1,total:2,label:'Не звірено: Готівка'})
  expect(needsReview(t)).toBe(false)
 })
 it('names the recipient when only outgoing balance is confirmed',()=>{
  expect(transactionBalanceStatus({...transfer(),accountVerifiedAt:stamp},names).label).toBe('Не звірено: Монобанк')
 })
 it('confirms the expense account without requiring a separate loan-balance leg',()=>{
  expect(transactionBalanceStatus(makeTxn({loanAccountId:'loan',accountVerifiedAt:stamp}),names)).toMatchObject({verified:true,total:1,confirmed:1,label:'Залишок звірено'})
 })
 it('still requires the payment account when only the loan was confirmed',()=>{
  expect(transactionBalanceStatus(makeTxn({loanAccountId:'loan',loanVerifiedAt:stamp}),names)).toMatchObject({verified:false,total:1,confirmed:0,label:'Залишок не звірено'})
 })
 it('uses plural once both transfer balances were confirmed',()=>{
  expect(transactionBalanceStatus({...transfer(),accountVerifiedAt:stamp,counterVerifiedAt:stamp},names)).toMatchObject({verified:true,label:'Залишки звірено'})
 })
 it('does not infer confirmation from transaction review or a legacy flag',()=>{
  expect(transactionBalanceStatus({...transfer(),clearedStatus:'reconciled'},names)).toMatchObject({verified:false,confirmed:0,label:'Залишки не звірено'})
 })
 it('keeps ordinary expenses singular and ignores unrelated stale counterpart flags',()=>{
  expect(transactionBalanceStatus(makeTxn({accountVerifiedAt:stamp,counterVerifiedAt:stamp})).label).toBe('Залишок звірено')
 })
 it('provides understandable fallback names while account data is loading',()=>{
  expect(transactionBalanceStatus({...transfer(),accountVerifiedAt:stamp}).label).toBe('Не звірено: рахунок одержувача')
 })
 it('renders the missing account without numeric shorthand and keeps row editing',()=>{
  const t={...transfer(),counterVerifiedAt:stamp};const onSelect=vi.fn()
  render(<TransactionRow transaction={t} {...names} onSelect={onSelect}/>)
  expect(screen.getByText('Не звірено: Готівка')).toBeVisible()
  expect(screen.queryByText('Звірено 1 із 2')).toBeNull()
  expect(screen.getByLabelText(/Це звірка залишків, а не статус виконання транзакції/)).toBeVisible()
  screen.getByRole('button').click()
  expect(onSelect).toHaveBeenCalledWith(t)
 })
 it('never shows missing actual-balance confirmation for a planned transaction',()=>{
  render(<TransactionRow transaction={{...transfer(),status:'planned'}} {...names}/>)
  expect(screen.getByText('Заплановано')).toBeVisible()
  expect(screen.queryByText(/Не звірено/)).toBeNull()
 })
})