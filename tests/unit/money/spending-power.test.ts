import {describe,it,expect} from 'vitest'
import {creditCardSummary,spendingPowerSummary,netWorthSummary,isSpendingAccount} from '@/lib/money/balances'
import {UAH_RATES} from '@/lib/money/fx'
import {makeAccount} from '../_factories'
const card=(balance:number,limit:number|null=50000)=>makeAccount({type:'credit_card',currentBalance:balance,creditLimit:limit})
describe('credit-card spending capacity',()=>{
 it('shows the unused Alliance limit without turning debt into own money',()=>{expect(creditCardSummary(card(-43080.75))).toMatchObject({used:43080.75,ownFunds:0,availableCredit:6919.25,available:6919.25,overLimit:0})})
 it('clamps an over-limit card independently and retains the debt',()=>{expect(creditCardSummary(card(-186835.25,160000))).toMatchObject({used:186835.25,ownFunds:0,availableCredit:0,available:0,overLimit:26835.25,utilization:1})})
 it('has no capacity at the exact limit',()=>{expect(creditCardSummary(card(-50000))).toMatchObject({available:0,overLimit:0})})
 it('separates deposited own funds from unused credit',()=>{expect(creditCardSummary(card(5000))).toMatchObject({ownFunds:5000,availableCredit:50000,available:55000,used:0})})
 it('exposes missing limits without inventing capacity or an over-limit warning',()=>{expect(creditCardSummary(card(-1000,null))).toMatchObject({limitKnown:false,available:0,used:1000,overLimit:0})})
 it('still includes own funds when a limit is missing',()=>{expect(creditCardSummary(card(500,null)).available).toBe(500)})
 it('retains over-limit debt when the known limit is zero',()=>{expect(creditCardSummary(card(-100,0))).toMatchObject({limitKnown:true,available:0,overLimit:100})})
 it('never exposes a negative limit as borrowing capacity',()=>{expect(creditCardSummary(card(100,-1000))).toMatchObject({limit:0,availableCredit:0,available:100})})
})
describe('family spending power',()=>{
 it('does not subtract an overdrawn card from another card or own cash',()=>{
  const accounts=[makeAccount({currentBalance:14000}),card(-43080.75),card(-186835.25,160000)]
  expect(spendingPowerSummary(accounts,'UAH')).toMatchObject({ownFunds:14000,availableCredit:6919.25,totalAvailable:20919.25,creditLimit:210000,creditDebt:229916,overLimit:26835.25})
  expect(netWorthSummary(accounts,'UAH')).toMatchObject({totalAssets:14000,totalLiabilities:229916,netWorth:-215916})
 })
 it('counts money parked on a credit card exactly once',()=>{expect(spendingPowerSummary([makeAccount({currentBalance:1000}),card(5000)],'UAH')).toMatchObject({ownFunds:6000,availableCredit:50000,totalAvailable:56000})})
 it('excludes savings, investments and loans from spendable own money',()=>{const accounts=['savings','investment','crypto','receivable','bank_loan'].map(type=>makeAccount({type:type as ReturnType<typeof makeAccount>['type'],currentBalance:10000}));expect(spendingPowerSummary(accounts,'UAH').totalAvailable).toBe(0)})
 it('excludes archived cards and cash',()=>{const accounts=[{...card(1000),archivedAt:'2026-09-01'},{...makeAccount({currentBalance:999}),archivedAt:'2026-09-01'}];expect(spendingPowerSummary(accounts,'UAH')).toMatchObject({ownFunds:0,availableCredit:0,creditLimit:0,creditDebt:0})})
 it('keeps a debit overdraft as debt without taking cash out of another account',()=>{const accounts=[makeAccount({currentBalance:1000}),makeAccount({type:'bank_debit',currentBalance:-200})];expect(spendingPowerSummary(accounts,'UAH').ownFunds).toBe(1000);expect(netWorthSummary(accounts,'UAH').netWorth).toBe(800)})
 it('converts each capacity after clamping in the account currency',()=>{const accounts=[makeAccount({currency:'USD',currentBalance:100}),{...card(-100,1000),currency:'EUR' as const},{...card(-2000,1000),currency:'USD' as const}];const s=spendingPowerSummary(accounts,'UAH');expect(s.ownFunds).toBeCloseTo(100*UAH_RATES.USD,2);expect(s.availableCredit).toBeCloseTo(900*UAH_RATES.EUR,2);expect(s.totalAvailable).toBeCloseTo(s.ownFunds+s.availableCredit,2)})
 it('does not lose kopecks when summing own money and credit',()=>{expect(spendingPowerSummary([makeAccount({currentBalance:0.1}),card(-0.8,1)],'UAH').totalAvailable).toBe(0.3)})
 it('returns zero for an empty family',()=>{expect(spendingPowerSummary([],'UAH').totalAvailable).toBe(0)})
 it('tracks unknown card limits',()=>{expect(spendingPowerSummary([card(-100,null),card(200,null)],'UAH')).toMatchObject({unknownLimitCount:2,availableCredit:0,ownFunds:200})})
 it('does not change any stored signed balances',()=>{const a=card(-186835.25,160000);spendingPowerSummary([a],'UAH');expect(a.currentBalance).toBe(-186835.25);expect(a.creditLimit).toBe(160000)})
 it('includes only active spending-account types',()=>{expect(isSpendingAccount(card(10))).toBe(true);expect(isSpendingAccount(makeAccount({type:'savings'}))).toBe(false)})
})