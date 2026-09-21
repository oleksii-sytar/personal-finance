import {describe,it,expect} from 'vitest'
import {destinationChanged,destinationError,destinationPatch,emptyDestination,transactionDestination} from '@/lib/loans/destination'
import {personalSpendingAccounts,spendingPowerSummary} from '@/lib/money/balances'
import {convert} from '@/lib/money/fx'
import {tools} from '@/lib/mcp/catalog'
import {makeAccount,makeTxn} from './_factories'
describe('explicit payment destination',()=>{
 const t=makeTxn({loanAccountId:'loan',loanInstallmentId:'row',loanPrincipal:6,loanComponents:{fees:4},loanBasis:'confirmed',amount:10})
 it('detaches the entire loan leg, never the bank expense',()=>{
  expect(destinationPatch(null)).toEqual({loanAccountId:null,loanInstallmentId:null,loanPrincipal:0,loanComponents:{},loanBasis:null})
  expect(destinationPatch(null)).not.toHaveProperty('amount')
  expect(destinationChanged(t,null)).toBe(true)
 })
 it('treats missing and null fee fields alike when checking for changes',()=>expect(destinationChanged(t,transactionDestination(t))).toBe(false))
 it('requires fresh allocation for a new destination',()=>{
  const d=emptyDestination('other')
  expect(d.principal).toBeNull();expect(d.components).toEqual({})
  expect(destinationError(d,10)).not.toBeNull()
 })
 it('validates principal plus fees, but does not double-count a whole obligation',()=>{
  const d=transactionDestination(t)!
  expect(destinationError(d,9)).not.toBeNull()
  expect(destinationError(d,10)).toBeNull()
  expect(destinationError({...d,principal:10,basis:'obligation'},10)).toBeNull()
 })
 it('keeps detachment and explicit destination fields available to MCP',()=>{
  const update=tools.find(t=>t.name==='update_transaction')!
  const fields=update.inputSchema.properties?.values.properties
  expect(fields?.loan_account_id).toBeDefined()
  expect(fields?.loan_principal).toBeDefined()
  expect(update.description).toContain('removes its loan and installment link')
 })
})
describe('personal money uses ownership, not creator or family membership',()=>{
 const list=[
  makeAccount({id:'mine',ownerUserId:'me',createdBy:'wife',type:'cash',currentBalance:700}),
  makeAccount({id:'wife',ownerUserId:'wife',createdBy:'me',currentBalance:900}),
  makeAccount({id:'unknown',ownerUserId:null,createdBy:'me',currentBalance:500}),
  makeAccount({id:'joint',ownerUserId:'me',isShared:true,currentBalance:400}),
  makeAccount({id:'archived',ownerUserId:'me',archivedAt:'2026-09-01',currentBalance:300}),
  makeAccount({id:'card',ownerUserId:'me',type:'credit_card',currentBalance:-1000,creditLimit:5000}),
 ]
 it('includes only explicitly owned non-shared active accounts',()=>expect(personalSpendingAccounts(list,'me').map(a=>a.id)).toEqual(['mine','card']))
 it('does not call credit limits personal money',()=>expect(spendingPowerSummary(personalSpendingAccounts(list,'me'),'UAH').ownFunds).toBe(700))
 it('uses a different scope for the second member',()=>expect(spendingPowerSummary(personalSpendingAccounts(list,'wife'),'UAH').ownFunds).toBe(900))
 it('never falls back to family totals for a missing user',()=>expect(personalSpendingAccounts(list,undefined)).toEqual([]))
 it('converts owned foreign-currency funds using the same exchange rates',()=>{
  const a=makeAccount({ownerUserId:'me',currency:'EUR',currentBalance:2})
  expect(spendingPowerSummary(personalSpendingAccounts([a],'me'),'UAH').ownFunds).toBeCloseTo(convert(2,'EUR','UAH'),2)
 })
})