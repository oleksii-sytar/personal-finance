import {describe,it,expect} from 'vitest'
import {automaticSpending,reserveTarget} from '@/lib/calculations/spending-model'
import {SPENDING_HISTORY_DAYS} from '@/lib/calculations/history'
import {buildForecast} from '@/lib/calculations/forecast'
import {monthlyTotals} from '@/lib/calculations/reports'
import {addDays,localDay} from '@/lib/calculations/dates'
import type {Category} from '@/types/domain'
import {makeAccount,makeTxn} from '../_factories'

const now=new Date('2026-09-15T12:00:00Z'),today=localDay(now)
const cash=makeAccount({id:'cash',currentBalance:10000})
const tx=(patch:Parameters<typeof makeTxn>[0]={})=>makeTxn({accountId:'cash',transactionDate:'2026-09-01',amount:1400,categoryId:'food',...patch})
const food={id:'food',name:'Food',type:'expense',isEssential:false} as Category
const business={id:'business',name:'Business',type:'expense',isEssential:true,includeInDailyForecast:false} as Category
const options={categories:[food,business]}
const rows=[tx({id:'food-expense',description:'Groceries'}),tx({id:'business-expense',description:'Supplies',categoryId:'business',amount:7000})]

describe('category-scoped daily forecasting',()=>{
 it('filters daily estimates without changing actual expenses or source records',()=>{
  const before=JSON.stringify(rows),model=automaticSpending([cash],rows,'UAH','2026-09-30',now,options)
  expect(model.daily).toBe(100)
  expect(model.exclusions).toEqual(expect.arrayContaining([expect.objectContaining({id:'business-expense',reason:'category'})]))
  expect(monthlyTotals(rows,2026,8,'UAH',{reference:now}).expense).toBe(8400)
  expect(JSON.stringify(rows)).toBe(before)
 })
 it('keeps reserve and forecast category choices independent',()=>{
  expect(reserveTarget([cash],rows,'UAH',7,now,options).amount).toBe(3000)
  expect(automaticSpending([cash],rows,'UAH','2026-09-30',now,{categories:[{...food,isEssential:true},business]}).daily).toBe(100)
  expect(reserveTarget([cash],rows,'UAH',7,now,{categories:[food,{...business,includeInDailyForecast:true}]}).amount).toBe(3000)
 })
 it('always retains explicitly planned payments in excluded categories',()=>{
  const planned=tx({id:'business-plan',categoryId:'business',amount:1000,status:'planned',transactionDate:'2026-09-16',description:'Planned equipment'})
  const model=buildForecast([cash],[...rows,planned],'UAH','2026-09-16',now,7,options)
  expect(model.summary.expense).toBe(1000)
  expect(model.summary.expenseCount).toBe(1)
  expect(model.forecast.points.at(-1)?.balance).toBe(8900)
  expect(model.reserve).toBe(4000)
 })
 it('allows zero automatic spending when all observed categories are disabled',()=>{
  const model=automaticSpending([cash],rows,'UAH','2026-09-30',now,{categories:[{...food,includeInDailyForecast:false},business]})
  expect(model.daily).toBe(0)
  expect(model.canEstimate).toBe(true)
  expect(model.days).toBe(14)
 })
 it('preserves individual one-off exceptions and includes uncategorized spending',()=>{
  const model=automaticSpending([cash],[tx({forecastBehavior:'one_off'}),tx({id:'uncategorized',categoryId:null,amount:280})],'UAH','2026-09-30',now,options)
  expect(model.daily).toBe(20)
  expect(model.excludedOneOff).toBe(1400)
 })
 it('uses the same behavior for existing categories with no new flag',()=>{
  expect(automaticSpending([cash],rows,'UAH','2026-09-30',now).daily).toBe(600)
 })
})

describe('bounded spending history',()=>{
 it('uses only the latest 90 complete days even with 500 days of expenses',()=>{
  const history=Array.from({length:500},(_,i)=>tx({id:'day-'+i,transactionDate:addDays(today,-i-1),amount:i<SPENDING_HISTORY_DAYS?100:10000,description:'Groceries'}))
  const model=automaticSpending([cash],history,'UAH','2026-09-30',now)
  expect(model.days).toBe(90)
  expect(model.sampleCount).toBe(90)
  expect(model.daily).toBe(100)
  expect(model.from).toBe(addDays(today,-90))
  expect(model.to).toBe(addDays(today,-1))
 })
 it('slides the window as a new day completes',()=>{
  const history=Array.from({length:90},(_,i)=>tx({id:'day-'+i,transactionDate:addDays(today,-i-1),amount:i===89?9100:100,description:'Groceries'}))
  const before=automaticSpending([cash],history,'UAH','2026-09-30',now)
  const after=automaticSpending([cash],[...history,tx({id:'new-day',transactionDate:today,amount:100,description:'Groceries'})],'UAH','2026-09-30',new Date('2026-09-16T12:00:00Z'))
  expect(before.daily).toBe(200)
  expect(after.days).toBe(90)
  expect(after.daily).toBe(100)
 })
})