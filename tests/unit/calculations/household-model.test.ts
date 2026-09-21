import {describe,it,expect} from 'vitest'
import {automaticSpending,reserveTarget,rollingOriginComparison} from '@/lib/calculations/spending-model'
import {accountObservation,periodCoverage} from '@/lib/calculations/history'
import {buildForecast} from '@/lib/calculations/forecast'
import {monthlyTotals,spendingByCategory} from '@/lib/calculations/reports'
import {reportQuality,historicalValue} from '@/lib/money/statistical'
import {ownerResources,savingsTotal,positionHistory,scoreForecast,forecastEvaluations} from '@/lib/calculations/household'
import {spendingPowerSummary,netWorthSummary} from '@/lib/money/balances'
import {localDay,addDays,monthEnd} from '@/lib/calculations/dates'
import type {Category,HistoryCoverage,ForecastSnapshot,WorkspaceMember,FinancialModelData} from '@/types/domain'
import {makeAccount,makeTxn} from '../_factories'
const now=new Date('2026-09-15T12:00:00Z'),cash=makeAccount({id:'cash',currentBalance:10000}),card=makeAccount({id:'card',type:'credit_card',currentBalance:-5000,creditLimit:20000})
const tx=(over:Parameters<typeof makeTxn>[0]={})=>makeTxn({accountId:'cash',transactionDate:'2026-09-01',amount:1400,...over})
const cover=(accountId='cash',over:Partial<HistoryCoverage>={}):HistoryCoverage=>({id:accountId,workspaceId:'ws',accountId,fromDate:'2026-09-01',toDate:'2026-09-14',kind:'complete',confirmedAt:'2026-09-15T10:00:00Z',confirmedBy:'u',...over})
const food={id:'food',isEssential:true} as Category
const plan=(over:Parameters<typeof makeTxn>[0]={})=>tx({status:'planned',transactionDate:'2026-09-16',...over})
describe('account history is evidence, not the creation date',()=>{
 it('keeps fourteen imported days when a second account has only five',()=>{
  const recent=makeAccount({id:'recent',createdAt:'2026-09-15'}),r=automaticSpending([cash,recent],[tx(),tx({accountId:'recent',transactionDate:'2026-09-10',amount:50})],'UAH','2026-09-30',now)
  expect(r.days).toBe(14);expect(r.daily).toBe(110);expect(r.canEstimate).toBe(true);expect(r.confidence).toBe('preliminary')
 })
 it('uses incoming transfers to establish an account observation start',()=>{
  const r=accountObservation(cash,[tx({kind:'transfer',accountId:'other',counterAccountId:'cash'})],[],now)
  expect(r.days).toHaveLength(14);expect(r.inferred).toBe(true)
 })
 it('accepts confirmed zero days and excludes days before opening',()=>{
  const r=accountObservation(cash,[],[cover('cash',{kind:'not_open',toDate:'2026-09-09'}),cover('cash',{fromDate:'2026-09-10',kind:'no_activity'})],now)
  expect(r.days).toHaveLength(5);expect(r.inferred).toBe(false)
  const model=automaticSpending([cash],[],'UAH','2026-09-30',now,{coverage:[cover('cash',{kind:'no_activity'})]})
  expect(model.canEstimate).toBe(true);expect(model.daily).toBe(0)
 })
 it('does not turn a missing or invalidated interval into confirmed zero',()=>{
  expect(periodCoverage([cash],[cover('cash',{invalidatedAt:'2026-09-15'})],'2026-09-01','2026-09-14').complete).toBe(false)
  expect(periodCoverage([cash],[cover('cash',{toDate:'2026-09-13'})],'2026-09-01','2026-09-14').complete).toBe(false)
  expect(periodCoverage([cash],[],'2026-10-01','2026-09-15').complete).toBe(false)
 })
 it('does not gate preliminary spending on empty accounts or a five-transaction quota',()=>{
  const result=automaticSpending([cash,makeAccount({id:'empty'})],[tx()],'UAH','2026-09-30',now)
  expect(result.canEstimate).toBe(true);expect(result.daily).toBe(100);expect(result.unknownAccounts).toBe(2)
 })
 it('ignores an unfinished current day for estimation and loan-only coverage for reports',()=>{
  expect(automaticSpending([cash],[tx({transactionDate:'2026-09-15'})],'UAH','2026-09-30',now).canEstimate).toBe(false)
  expect(periodCoverage([cash,makeAccount({type:'bank_loan'})],[cover()],'2026-09-01','2026-09-14').complete).toBe(true)
 })
})
describe('residual spending and plans',()=>{
 it('deducts a variable plan from its flow only, not the entire category',()=>{
  const rows=[tx({amount:1400,description:'Shop A',categoryId:'food'}),tx({amount:700,description:'Shop B',categoryId:'food'}),plan({description:'Shop A',categoryId:'food',amount:10000})]
  const r=automaticSpending([cash],rows,'UAH','2026-09-30',now)
  expect(r.daily).toBe(50);expect(r.recurringStreams).toBe(0)
 })
 it('does not suppress ordinary purchases just because one purchase is planned',()=>{
  const rows=[tx({amount:1400,description:'Groceries'}),plan({description:'Groceries',amount:150})]
  expect(automaticSpending([cash],rows,'UAH','2026-09-30',now).daily).toBe(90)
 })
 it('keeps a scheduled rent once and other housing costs in the model',()=>{
  const rows=[tx({description:'Rent actual',flowKey:'rent',amount:6000}),tx({description:'Home supplies',amount:1400}),plan({description:'Rent future',flowKey:'rent',forecastBehavior:'scheduled',amount:6000})]
  const r=buildForecast([cash],rows,'UAH','2026-09-16',now,7)
  expect(r.trend.daily).toBe(100);expect(r.forecast.points.at(-1)?.balance).toBe(3900)
 })
 it('learns from credit-card purchases and assumes own money for unplanned spending',()=>{
  const r=buildForecast([cash,card],[tx({accountId:'card'})],'UAH','2026-09-16',now)
  expect(r.trend.cashDaily).toBe(100);expect(r.forecast.points.at(-1)?.balance).toBe(9900)
  expect(r.forecast.creditCards.accounts[0].projectedDebt).toBe(5000)
 })
 it('excludes one-off expenses and future income guesses, without writing any rows',()=>{
  const rows=[tx({forecastBehavior:'one_off',amount:90000}),tx({kind:'income',amount:50000}),tx({amount:1400})],before=JSON.stringify(rows)
  const r=buildForecast([cash],rows,'UAH','2026-09-16',now)
  expect(r.forecast.points.at(-1)?.balance).toBe(9900);expect(r.summary.income).toBe(0);expect(JSON.stringify(rows)).toBe(before)
 })
 it('counts full explicit loan payments in cash but not paid, deleted or suspended plans',()=>{
  const rows=[plan({loanAccountId:'loan',amount:8000}),plan({status:'completed',transactionDate:'2026-09-15',loanAccountId:'loan',amount:1000}),plan({deletedAt:'2026-09-15',amount:1000}),plan({recurrenceSuspended:true,amount:1000})]
  const r=buildForecast([cash],rows,'UAH','2026-09-16',now)
  expect(r.summary.expense).toBe(8000);expect(r.forecast.points.at(-1)?.balance).toBe(2000)
 })
 it('keeps savings separate and includes positive card own money in the starting point',()=>{
  const accounts=[cash,makeAccount({isSavings:true,currentBalance:7000}),makeAccount({type:'credit_card',currentBalance:500}),makeAccount({type:'bank_debit',currentBalance:-100})]
  expect(buildForecast(accounts,[],'UAH','2026-09-15',now).forecast.opening).toBe(spendingPowerSummary(accounts,'UAH').ownFunds)
 })
})
describe('reserve and model selection',()=>{
 it('combines essential residual needs and obligations using the same shared result',()=>{
  const rows=[tx({categoryId:'food'}),tx({categoryId:'fun',amount:1400}),plan({description:'Loan',loanAccountId:'loan',amount:1000})],options={categories:[food,{id:'fun',isEssential:false} as Category]}
  const reserve=reserveTarget([cash],rows,'UAH',7,now,options),forecast=buildForecast([cash],rows,'UAH','2026-09-30',now,7,options)
  expect(reserve.amount).toBe(1600);expect(forecast.reserve).toBe(1600)
  expect(forecast.forecast.points[0].balance).toBe(10000)
 })
 it('does not subtract a reserve as another transaction',()=>{
  const rows=[tx()]
  expect(buildForecast([cash],rows,'UAH','2026-09-16',now,7).forecast.points.at(-1)?.balance).toBe(buildForecast([cash],rows,'UAH','2026-09-16',now,30).forecast.points.at(-1)?.balance)
 })
 it('uses expanding training windows, reports errors, and retains a perfect baseline',()=>{
  const r=rollingOriginComparison(Array(70).fill(100))
  expect(r.folds).toBeGreaterThanOrEqual(3);expect(r.baselineMAE).toBe(0);expect(r.smoothingMAE).toBe(0)
  const rows=Array.from({length:70},(_,i)=>tx({transactionDate:addDays('2026-09-15',i-70),amount:100}))
  const result=automaticSpending([cash],rows,'UAH','2026-09-30',now,{coverage:[cover('cash',{fromDate:'2026-07-07'})]})
  expect(result.method).toBe('mean');expect(result.confidence).toBe('history')
 })
 it('never lets future actual rows leak into the historical estimate',()=>{
  const a=automaticSpending([cash],[tx()],'UAH','2026-09-30',now),b=automaticSpending([cash],[tx(),tx({transactionDate:'2026-10-01',amount:999999})],'UAH','2026-09-30',now)
  expect(b.daily).toBe(a.daily);expect(b.comparison).toEqual(a.comparison)
 })
 it('orders scenario bounds around the baseline without claiming confidence probabilities',()=>{
  const result=buildForecast([cash],[tx()],'UAH','2026-09-30',now)
  for(const p of result.forecast.points){expect(p.lower).toBeLessThanOrEqual(p.balance);expect(p.upper).toBeGreaterThanOrEqual(p.balance)}
 })
})
describe('financial period meaning and FX',()=>{
 it('counts full loan expenses and purchases once, excluding borrowed income and own transfers',()=>{
  const rows=[tx({kind:'income',amount:2000}),tx({kind:'income',accountingClass:'principal',amount:100000}),tx({kind:'transfer',amount:30000,counterAccountId:'card'}),tx({accountId:'card',amount:1000}),tx({amount:500,accountingClass:'principal'}),tx({amount:9060,loanAccountId:'loan',loanPrincipal:5277.86,loanBasis:'confirmed'})]
  const totals=monthlyTotals(rows,2026,8,'UAH',{reference:now,rates:[]})
  expect(totals.income).toBe(2000);expect(totals.expense).toBeCloseTo(10560);expect(totals.net).toBeCloseTo(-8560)
  expect(spendingByCategory(rows,[],2026,8,'UAH',{reference:now,rates:[]}).reduce((s,c)=>s+c.total,0)).toBeCloseTo(totals.expense)
 })
 it.each(['unknown','obligation'] as const)('counts the whole payment regardless of legacy %s allocation',loanBasis=>{
  const rows=[tx({loanAccountId:'loan',loanPrincipal:1000,loanBasis})]
  expect(monthlyTotals(rows,2026,8,'UAH',{reference:now}).expense).toBe(1400)
  expect(reportQuality(rows,'UAH','2026-09',{reference:now})).toMatchObject({unallocated:[],provisional:false,incomplete:false})
 })
 it('uses date-specific rates and flags missing historical rates',()=>{
  const rates=[{currency:'USD' as const,date:'2026-09-01',rate:40},{currency:'USD' as const,date:'2026-09-02',rate:42}],rows=[tx({currency:'USD',amount:10}),tx({currency:'USD',amount:10,transactionDate:'2026-09-02'})]
  expect(monthlyTotals(rows,2026,8,'UAH',{rates,reference:now}).expense).toBe(820)
  expect(historicalValue(10,'USD','UAH','2026-09-03',rates)).toBeNull()
  expect(reportQuality(rows,'UAH','2026-09',{rates:rates.slice(0,1),reference:now}).missingRates).toEqual([rows[1].id])
  expect(automaticSpending([cash],rows,'UAH','2026-09-30',now,{rates:[]}).canEstimate).toBe(false)
 })
 it('uses Kyiv calendar dates across midnight and month rollover',()=>{
  expect(localDay(new Date('2026-09-30T21:30:00Z'))).toBe('2026-10-01');expect(monthEnd('2028-02')).toBe('2028-02-29')
  const rows=[tx({amount:100,transactionDate:'2026-09-30'}),tx({amount:200,transactionDate:'2026-10-01'})]
  expect(monthlyTotals(rows,2026,8,'UAH',{reference:new Date('2026-09-30T21:30:00Z')}).expense).toBe(100)
  expect(monthlyTotals(rows,2026,9,'UAH',{reference:new Date('2026-09-30T21:30:00Z')}).expense).toBe(200)
 })
})
describe('resources and honest historical positions',()=>{
 it('counts shared resources once and excludes limits from assets or income',()=>{
  const accounts=[makeAccount({ownerUserId:'a',currentBalance:1000}),makeAccount({ownerUserId:'b',currentBalance:2000}),makeAccount({isShared:true,ownerUserId:'a',currentBalance:3000}),makeAccount({ownerUserId:'a',isSavings:true,currentBalance:5000}),card]
  const owners=ownerResources(accounts,[{userId:'a',displayName:'A'},{userId:'b',displayName:'B'}] as WorkspaceMember[],'UAH')
  expect(owners.find(o=>o.id==='a')).toMatchObject({own:1000,savings:5000});expect(owners.find(o=>o.id==='shared')?.own).toBe(3000)
  expect(owners.reduce((s,o)=>s+o.own,0)).toBe(6000);expect(savingsTotal(accounts,'UAH')).toBe(5000)
  expect(netWorthSummary(accounts,'UAH').netWorth).toBe(6000)
  expect(netWorthSummary([...accounts.slice(0,-1),{...card,creditLimit:999999}],'UAH').netWorth).toBe(6000)
 })
 it('does not manufacture historical positions or apply today FX to them',()=>{
  const model={coverage:[],forecasts:[],positions:[{id:'s',workspaceId:'ws',date:'2026-09-01',recordedAt:'2026-09-01',accounts:[makeAccount({currency:'USD',currentBalance:10})]}]} as FinancialModelData
  expect(positionHistory(model,'UAH',[])[0].net).toBeNull()
  expect(positionHistory(model,'UAH',[{currency:'USD',date:'2026-09-01',rate:40}])[0].net).toBe(400)
  expect(positionHistory({...model,positions:[]},'UAH',[])).toEqual([])
 })
 it('scores frozen forecasts only where later actual dates exist',()=>{
  const snapshot={id:'f',asOf:'2026-09-01',through:'2026-09-03',currency:'UAH',points:[{date:'2026-09-01',balance:100},{date:'2026-09-02',balance:100},{date:'2026-09-03',balance:50}]} as ForecastSnapshot,before=JSON.stringify(snapshot)
  expect(scoreForecast(snapshot,[{date:'2026-09-02',balance:-10}])).toMatchObject({count:1,mae:110,shortfallMissed:true})
  expect(scoreForecast(snapshot,[])).toBeNull();expect(JSON.stringify(snapshot)).toBe(before)
  expect(forecastEvaluations({coverage:[],forecasts:[snapshot],positions:[]},[],now)).toEqual([])
 })
})

describe('forecast and reporting correction regressions',()=>{
 it('does not turn legacy allocation estimates into uncertainty about the paid expense',()=>{
  const rows=[tx({id:'estimated-loan',loanAccountId:'loan',loanPrincipal:1000,loanBasis:'estimated'})]
  expect(monthlyTotals(rows,2026,8,'UAH',{reference:now}).expense).toBe(1400)
  expect(reportQuality(rows,'UAH','2026-09',{reference:now})).toMatchObject({
   recognizedExpense:1400,estimatedExpense:0,estimated:[],
   provisional:false,incomplete:false,unallocated:[]
  })
 })
 it('includes outstanding plans today without another ordinary daily budget',()=>{
  const rows=[tx({categoryId:'food'}),plan({id:'due-today',loanAccountId:'loan',amount:1000,transactionDate:'2026-09-15'})]
  const options={categories:[food]}
  expect(reserveTarget([cash],rows,'UAH',1,now,options).amount).toBe(1000)
  expect(reserveTarget([cash],rows,'UAH',7,now,options).amount).toBe(1600)
  expect(buildForecast([cash],rows,'UAH','2026-09-30',now,7,options).forecast.points[0].balance).toBe(9000)
 })
 it('does not change common forecast days when the requested horizon grows',()=>{
  const rows=[tx({categoryId:'food',description:'Groceries'}),plan({categoryId:'food',description:'Groceries',amount:150})]
  const options={categories:[food]}
  const short=buildForecast([cash],rows,'UAH','2026-09-30',now,7,options)
  const long=buildForecast([cash],rows,'UAH','2026-10-31',now,7,options)
  expect(long.forecast.points.slice(0,short.forecast.points.length)).toEqual(short.forecast.points)
  expect(long.reserve).toBe(short.reserve)
 })
 it('never edits source transactions while calculating reports and forecasts',()=>{
  const rows=[tx({id:'actual',categoryId:'food'}),plan({id:'plan',loanAccountId:'loan',amount:1000})]
  const original=JSON.stringify(rows)
  monthlyTotals(rows,2026,8,'UAH',{reference:now})
  reportQuality(rows,'UAH','2026-09',{reference:now})
  buildForecast([cash],rows,'UAH','2026-10-31',now,30,{categories:[food]})
  expect(JSON.stringify(rows)).toBe(original)
 })
})