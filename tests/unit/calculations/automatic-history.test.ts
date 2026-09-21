import {describe,it,expect} from 'vitest'
import {automaticSpending,safetyReserve,liquidityForecast} from '@/lib/calculations/liquidity'
import {calculatedBalance,isAfterBalanceAnchor} from '@/lib/money/balances'
import {makeAccount,makeTxn} from '../_factories'
const now=new Date(2026,8,9,12)
const a=makeAccount({id:'cash',type:'cash',createdAt:'2026-08-10T12:00:00Z',balanceAnchorDate:'2026-09-09',balanceAnchorAt:'2026-09-09T09:00:00.123456Z',balanceAnchorAmount:10000,openingBalance:10000,currentBalance:10000})
const t=(patch:Parameters<typeof makeTxn>[0]={})=>makeTxn({accountId:a.id,amount:6000,transactionDate:'2026-08-10',...patch})
describe('automatic history and reserve',()=>{
 it('averages calendar days including zero-spend days',()=>{const p=automaticSpending([a],[t()],'UAH','2026-09-30',now);expect(p.days).toBe(30);expect(p.daily).toBe(200);expect(safetyReserve(p.daily,14)).toBe(2800)})
 it('excludes planned, deleted, income and transfer amounts',()=>{const p=automaticSpending([a],[t(),t({status:'planned'}),t({deletedAt:'2026-09-09'}),t({kind:'income'}),t({kind:'transfer'})],'UAH','2026-09-30',now);expect(p.daily).toBe(200);expect(p.sampleCount).toBe(1)})
 it('does not report no history as a safe zero estimate',()=>{const p=automaticSpending([a],[],'UAH','2026-09-30',now);expect(p.hasHistory).toBe(false);expect(p.provisional).toBe(true)})
 it('limits the observation window to 90 days',()=>{const old=makeAccount({...a,createdAt:'2026-01-01'});const p=automaticSpending([old],[t({transactionDate:'2026-01-01',amount:90000}),t({transactionDate:'2026-09-08',amount:900})],'UAH','2026-09-30',now);expect(p.daily).toBe(10)})
 it('labels an incomplete first day as provisional',()=>{const p=automaticSpending([makeAccount({...a,createdAt:'2026-09-09'})],[t({transactionDate:'2026-09-09',amount:100})],'UAH','2026-09-30',now);expect(p.partialDay).toBe(true);expect(p.provisional).toBe(true);expect(p.daily).toBe(0);expect(p.canEstimate).toBe(false)})
 it('learns card spending and assumes own funding for ordinary future costs',()=>{const card=makeAccount({...a,type:'credit_card'});const p=automaticSpending([card],[t()],'UAH','2026-09-30',now);expect(p.daily).toBe(200);expect(p.cashDaily).toBe(200)})
 it('does not charge a recognised rent twice in a covered month',()=>{const rent=[t({description:'Rent',transactionDate:'2026-07-10',amount:1000}),t({description:'Rent',transactionDate:'2026-08-10',amount:1000}),t({description:'Rent',forecastBehavior:'scheduled',transactionDate:'2026-09-10',amount:1000,status:'planned'})];const result=liquidityForecast([a],rent,'UAH','2026-09-10',now);expect(result.automatic.recurringStreams).toBe(1);expect(result.points.at(-1)?.balance).toBe(9000)})
})
describe('snapshot balance calculations',()=>{
 it('retains imported history in reports without reducing the current snapshot',()=>expect(calculatedBalance(a,[t({balancePostedAt:null})])).toBe(10000))
 it('counts a genuinely new movement once',()=>expect(calculatedBalance(a,[t({amount:100,balancePostedAt:'2026-09-09T09:00:00.123457Z'})])).toBe(9900))
 it('compares PostgreSQL microseconds rather than rounded milliseconds',()=>{expect(isAfterBalanceAnchor(t({balancePostedAt:'2026-09-09T09:00:00.123457Z'}),a)).toBe(true);expect(isAfterBalanceAnchor(t({balancePostedAt:a.balanceAnchorAt}),a)).toBe(false)})
 it('a later reconciliation covers earlier posted movements',()=>expect(calculatedBalance({...a,balanceAnchorAt:'2026-09-09T12:00:00Z',balanceAnchorAmount:7000},[t({balancePostedAt:'2026-09-09T10:00:00Z'})])).toBe(7000))
 it('evaluates the recipient side of a transfer independently',()=>{const b=makeAccount({...a,id:'bank',balanceAnchorAmount:1000});const transfer=t({kind:'transfer',counterAccountId:'bank',amount:100,counterAmount:90,balancePostedAt:null,counterBalancePostedAt:'2026-09-09T10:00:00Z'});expect(calculatedBalance(a,[transfer])).toBe(10000);expect(calculatedBalance(b,[transfer])).toBe(1090)})
 it('does not post planned or deleted movements',()=>expect(calculatedBalance(a,[t({status:'planned',balancePostedAt:'2026-09-09T10:00:00Z'}),t({deletedAt:'2026-09-09',balancePostedAt:'2026-09-09T10:00:00Z'})])).toBe(10000))
})