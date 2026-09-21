import {describe,it,expect} from 'vitest'
import {makeAccount,makeTxn} from './_factories'
import {parseEntryAmount,preferredAccounts,accountOwner,expenseAmount} from '@/lib/money/entry'
import {manualCandidates,reconciliationHints,transferCandidates} from '@/lib/import/matching'
import {parseLoanSchedule,unpaidSchedule,payoffScenario,type LoanInstallment,type LoanProfile} from '@/lib/loans/model'
import {calculatedBalance,transactionEffect} from '@/lib/money/balances'
import {liquidityForecast,safetyReserve} from '@/lib/calculations/liquidity'
const settings={userId:'u',workspaceId:'ws',displayCurrency:'UAH' as const,minimumSafeBalance:0,safetyBufferDays:7,defaultAccountId:'b',favoriteAccountIds:['c']}
const installment=(over:Partial<LoanInstallment>={}):LoanInstallment=>({id:'schedule',workspace_id:'ws',account_id:'loan',import_id:'import',sequence:1,payment_date:'2026-09-11',principal:5200,interest:19,fees:3781,insurance:0,other:0,payment_total:9000,principal_balance_after:184800,source_page:'1',status:'scheduled',created_at:'2026-09-10T08:00:00Z',...over})
const profile:LoanProfile={account_id:'loan',workspace_id:'ws',tracking_start_date:'2026-09-10',payment_account_id:'bank',updated_at:'2026-09-10T08:00:00Z'}
describe('Mobile entry and personal preferences',()=>{
 it('accepts Ukrainian decimal input without silently rounding',()=>{expect(parseEntryAmount('12 000,24')).toBe(12000.24);for(const value of ['','0','-1','1e3','12.345','1,2,3','Infinity'])expect(parseEntryAmount(value)).toBeNull()})
 it('orders default and favorites separately, without mutating account data',()=>{const accounts=['a','c','b'].map(id=>makeAccount({id}));expect(preferredAccounts(accounts,settings).map(a=>a.id)).toEqual(['b','c','a']);expect(accounts.map(a=>a.id)).toEqual(['a','c','b']);expect(preferredAccounts(accounts,{...settings,defaultAccountId:'a'}).map(a=>a.id)).toEqual(['a','c','b'])})
 it('never treats creator as owner',()=>{expect(accountOwner(makeAccount({createdBy:'u'}),[])).toBe('Власника не вказано');expect(accountOwner(makeAccount({isShared:true}),[])).toBe('Спільний рахунок')})
})
describe('Statement matching is a suggestion, not deduplication',()=>{
 const manual=makeTxn({accountId:'bank',amount:657,transactionDate:'2026-09-09',description:'Магазин'})
 const bank={date:'2026-09-09',amount:-657.24,description:'Магазин'}
 it('offers an integer manual amount against exact bank cents',()=>expect(manualCandidates(bank,'bank','UAH',[manual])).toHaveLength(1))
 it('rejects other accounts, currencies, old dates and non-rounded differences',()=>{for(const override of [{accountId:'other'},{currency:'USD' as const},{transactionDate:'2026-09-01'},{amount:657.1}])expect(manualCandidates(bank,'bank','UAH',[{...manual,...override}])).toHaveLength(0)})
 it('preserves two real identical tram rides as separate candidates',()=>{const rides=[makeTxn({accountId:'bank',amount:8,transactionDate:'2026-09-09'}),makeTxn({accountId:'bank',amount:8,transactionDate:'2026-09-09'})];expect(manualCandidates({...bank,amount:-8},'bank','UAH',rides)).toHaveLength(2);expect(rides.every(t=>!t.deletedAt)).toBe(true)})
 it('uses available time to avoid unrelated purchases',()=>expect(manualCandidates({...bank,occurredAt:'2026-09-09T18:00:00'},'bank','UAH',[{...manual,occurredAt:'2026-09-09T08:00:00'}])).toHaveLength(0))
 it('can link a loan payment only at its exact date and total',()=>{const t={...manual,amount:657.24,loanAccountId:'loan',loanPrincipal:500};expect(manualCandidates(bank,'bank','UAH',[t])).toHaveLength(1);expect(manualCandidates({...bank,date:'2026-09-10'},'bank','UAH',[t])).toHaveLength(0)})
 it('suggests a discrepancy explanation without mutating transactions',()=>{const a=makeAccount({id:'bank'}),t=makeTxn({accountId:'bank',amount:657.24});expect(reconciliationHints(a,[t],657.24)[0].ids).toEqual([t.id]);expect(t.deletedAt).toBeNull()})
 it('pairs opposite legs only across different accounts',()=>{const a=makeTxn({accountId:'a',amount:100}),b=makeTxn({accountId:'b',kind:'income',amount:100});expect(transferCandidates([a,b])).toHaveLength(1);expect(transferCandidates([a,{...b,accountId:'a'}])).toHaveLength(0)})
})
describe('Loans start at a current snapshot, not the contract origin',()=>{
 it('retains unknown fees as unknown and parses a historical schedule',()=>{const parsed=parseLoanSchedule('payment_date,principal,payment_total,fees\n2017-08-01,5000,9000,\n2026-10-01,5200,9000,3781','UAH');expect(parsed.errors).toEqual([]);expect(parsed.rows[0].fees).toBeNull();expect(parsed.rows[0].payment_date).toBe('2017-08-01')})
 it('rejects duplicate pages and components over total',()=>{expect(parseLoanSchedule('payment_date,principal,payment_total\n2026-10-01,5200,9000\n2026-10-01,5200,9000','UAH').errors.length).toBeGreaterThan(0);expect(parseLoanSchedule('payment_date,principal,payment_total,fees\n2026-10-01,5200,9000,4000','UAH').errors.length).toBeGreaterThan(0)})
 it('keeps historical and superseded rows out of the active loan schedule',()=>{const rows=[installment({id:'old',status:'historical',payment_date:'2017-08-01'}),installment({id:'replaced',status:'superseded'}),installment()];expect(unpaidSchedule(rows,[]).map(r=>r.id)).toEqual(['schedule'])})
 it('books one cash outflow, principal reduction and servicing expense',()=>{const t=makeTxn({accountId:'bank',amount:9000,loanAccountId:'loan',loanPrincipal:5200,loanBasis:'confirmed'});expect(transactionEffect(t,makeAccount({id:'bank'}))).toBe(-9000);expect(transactionEffect(t,makeAccount({id:'loan'}))).toBe(5200);expect(expenseAmount(t)).toBe(3800)})
 it('keeps imported history before the balance anchor out of current balances',()=>{const a=makeAccount({id:'loan',balanceAnchorAmount:-190000,balanceAnchorAt:'2026-09-10T08:00:00Z'});expect(calculatedBalance(a,[makeTxn({loanAccountId:'loan',loanPrincipal:5200,loanBalancePostedAt:null})])).toBe(-190000)})
 it('forecasts the full explicitly created payment, not just interest',()=>{const bank=makeAccount({id:'bank',type:'bank_debit',currentBalance:10000}),loan=makeAccount({id:'loan',type:'bank_loan',currentBalance:-190000});const plan=makeTxn({accountId:'bank',loanAccountId:'loan',amount:9000,loanPrincipal:5200,status:'planned',transactionDate:'2026-09-11'});const result=liquidityForecast([bank,loan],[plan],'UAH','2026-09-11',new Date(2026,8,10),0);expect(result.points.at(-1)?.balance).toBe(1000)})
 it('removes a confirmed installment from forecast and restores a deleted one',()=>{const paid=makeTxn({loanInstallmentId:'schedule'});expect(unpaidSchedule([installment()],[paid])).toHaveLength(0);expect(unpaidSchedule([installment()],[{...paid,deletedAt:'2026-09-10'}])).toHaveLength(1)})
 it('does not invent an early-payoff quote',()=>{expect(payoffScenario(190000,[installment()],null).saving).toBeNull();expect(payoffScenario(5000,[installment()],5100).saving).toBe(3900)})
 it('does not create a card top-up from an outstanding card balance',()=>{const card=makeAccount({id:'loan',type:'credit_card',currentBalance:-500}),bank=makeAccount({id:'bank',currentBalance:1000});expect(liquidityForecast([card,bank],[],'UAH','2026-09-15',new Date(2026,8,10),0).points.at(-1)?.balance).toBe(1000)})
 it('calculates the reserve from spending and days',()=>expect(safetyReserve(123.45,7)).toBe(864.15))
})