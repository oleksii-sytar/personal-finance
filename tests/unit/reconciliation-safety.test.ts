import {describe,it,expect} from 'vitest'
import {parseSignedBalance,needsReview,pendingForAccount,verificationLabel,reliableTrend,transferPartners,financialChange} from '@/lib/reconciliation/model'
import {reconcileSchema} from '@/lib/validations/finance'
import {manualCandidates} from '@/lib/import/matching'
import {liquidityForecast} from '@/lib/calculations/liquidity'
import {monthlyTotals} from '@/lib/calculations/reports'
import type {Account,Transaction} from '@/types/domain'
const t={id:'t',accountId:'a',counterAccountId:'b',counterAmount:1000,kind:'transfer',amount:1000,currency:'UAH',transactionDate:'2026-09-10',status:'completed',description:'Переказ',clearedStatus:'cleared'} as Transaction
const account=(id:string,balance=0)=>({id,type:'bank_debit',currency:'UAH',currentBalance:balance,openingBalance:balance,createdAt:'2026-09-09T00:00:00Z'} as Account)
describe('Safe signed balance',()=>{
 it.each(['',' ','-','+','NaN','Infinity','1e6','1.234','1,2,3','1000000000000'])('rejects %s',v=>expect(parseSignedBalance(v)).toBeNull())
 it.each([['-41 116,45',-41116.45],['−41 116,45',-41116.45],['0',0],['+3500',3500],['3 500.00',3500]])('parses %s',(v,n)=>expect(parseSignedBalance(v)).toBe(n))
 it('blank cannot become zero through validation',()=>expect(reconcileSchema.safeParse({newBalance:''}).success).toBe(false))
})
describe('Independent review and bank confirmation',()=>{
 it('a transfer needs no category',()=>expect(needsReview(t)).toBe(false))
 it('financial edit returns a transfer to review',()=>expect(needsReview({...t,reviewRequired:true})).toBe(true))
 it('uncategorized expenses still need review even with legacy reconciled flag',()=>expect(needsReview({...t,kind:'expense',clearedStatus:'reconciled'})).toBe(true))
 it('one leg confirmation leaves the other pending',()=>{const x={...t,accountVerifiedAt:'2026-09-10T10:00:00Z'};expect(pendingForAccount(x,'a')).toBe(false);expect(pendingForAccount(x,'b')).toBe(true);expect(verificationLabel(x)).toContain('1 із 2')})
 it('planned movements are not pending actual balances',()=>expect(pendingForAccount({...t,status:'planned'},'a')).toBe(false))
 it('loan principal side is independently confirmed',()=>expect(pendingForAccount({...t,kind:'expense',loanAccountId:'loan',accountVerifiedAt:'now'},'loan')).toBe(true))
 it('financial changes differ from notes',()=>{expect(financialChange(t,{notes:'test'})).toBe(false);expect(financialChange(t,{amount:1001})).toBe(true)})
})
describe('Transfer matching in either import order',()=>{
 it('offers an existing transfer for imported incoming leg',()=>expect(manualCandidates({date:t.transactionDate,amount:1000,description:'Bank'},'b','UAH',[t])).toHaveLength(1))
 it('offers an existing transfer for outgoing leg',()=>expect(manualCandidates({date:t.transactionDate,amount:-1000,description:'Bank'},'a','UAH',[t])).toHaveLength(1))
 it('never offers a previously imported leg',()=>expect(manualCandidates({date:t.transactionDate,amount:1000,description:'Bank'},'b','UAH',[{...t,counterImportKey:'bank-id'}])).toHaveLength(0))
 it('does not approximate transfer amounts',()=>expect(manualCandidates({date:t.transactionDate,amount:999.5,description:'Bank'},'b','UAH',[t])).toHaveLength(0))
 it('finds a bank leg after a transfer already exists',()=>expect(transferPartners(t,'a','b',[t,{...t,id:'income',kind:'income',accountId:'b',counterAccountId:null}])).toHaveLength(1))
 it('keeps transfer out of income and expense',()=>{const r=monthlyTotals([t],2026,8,'UAH');expect(r.income).toBe(0);expect(r.expense).toBe(0);expect(r.net).toBe(0)})
})
describe('Honest forecast',()=>{
 it('one expensive day is insufficient',()=>expect(reliableTrend({hasHistory:true,partialDay:true,days:1,sampleCount:1,unknownAccounts:0})).toBe(false))
 it('requires history on all spending accounts',()=>expect(reliableTrend({hasHistory:true,partialDay:false,days:30,sampleCount:30,unknownAccounts:1})).toBe(false))
 it('does not call an arbitrary fourteen-day sample confirmed',()=>expect(reliableTrend({hasHistory:true,partialDay:false,days:14,sampleCount:5,unknownAccounts:0})).toBe(false))
 it('uses the shared model confidence rather than a second day gate',()=>expect(reliableTrend({confidence:'history'})).toBe(true))
 it('known-plan forecast includes salary but not credit limit',()=>{const a=account('a',14000),card={...account('c',-40000),type:'credit_card',creditLimit:100000} as Account;const income={...t,id:'salary',kind:'income',accountId:'a',counterAccountId:null,status:'planned',transactionDate:'2026-09-11',amount:20000} as Transaction;const result=liquidityForecast([a,card],[income],'UAH','2026-09-11',new Date(2026,8,10),0);expect(result.opening).toBe(14000);expect(result.points.at(-1)?.balance).toBe(34000)})
})