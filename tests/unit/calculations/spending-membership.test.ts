import {afterEach,describe,expect,it,vi} from 'vitest'
import {spendingMembership,type SpendingTrend} from '@/lib/calculations/spending-membership'
import {automaticSpending} from '@/lib/calculations/spending-model'
import {makeAccount,makeTxn} from '../_factories'
const now=new Date('2026-09-21T12:00:00Z')
afterEach(()=>vi.useRealTimers())
describe('daily spending membership explains the exact model rows',()=>{
 it('keeps large-review expenses included and distinguishes model exclusions',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now)
  const account=makeAccount({id:'cash'}),rows=[
   ...Array.from({length:10},(_,i)=>makeTxn({id:'ordinary-'+i,accountId:'cash',categoryId:'food',amount:100,transactionDate:'2026-09-'+String(i+1).padStart(2,'0')})),
   makeTxn({id:'large',accountId:'cash',categoryId:'other',amount:10000,transactionDate:'2026-09-11'}),
   makeTxn({id:'one-off',accountId:'cash',amount:999,forecastBehavior:'one_off',transactionDate:'2026-09-12'}),
   makeTxn({id:'loan',accountId:'cash',amount:9060,loanAccountId:'loan',transactionDate:'2026-09-12'}),
   makeTxn({id:'planned',accountId:'cash',status:'planned',transactionDate:'2026-09-25'}),
   makeTxn({id:'income',accountId:'cash',kind:'income',transactionDate:'2026-09-12'}),
   makeTxn({id:'today',accountId:'cash',transactionDate:'2026-09-21'}),
  ]
  const trend=automaticSpending([account],rows,'UAH','2026-09-30',now),statuses=spendingMembership(rows,[account],trend)
  for(const row of trend.ordinary)expect(statuses.get(row.id)?.included).toBe(true)
  for(const row of trend.exclusions)expect(statuses.get(row.id)?.included).toBe(false)
  expect(statuses.get('large')).toMatchObject({included:true,review:true})
  expect(statuses.get('one-off')).toMatchObject({included:false,reason:'Позначено як разову витрату'})
  expect(statuses.get('loan')).toMatchObject({included:false,reason:'Кредитний платіж враховується лише окремими планами'})
  expect(statuses.get('planned')?.reason).toContain('ще не фактична витрата')
  expect(statuses.get('income')?.reason).toBe('Це не витрата')
  expect(statuses.get('today')?.reason).toBe('Цей день ще не завершився')
 })
 it.each(['forecast','reserve'] as const)('names the correct %s category setting',purpose=>{
  const tx=makeTxn({id:'excluded'}),trend={ordinary:[],exclusions:[{id:tx.id,reason:'category'}],reviewRows:[],from:'2026-09-01',to:'2026-09-20',purpose} as unknown as SpendingTrend
  expect(spendingMembership([tx],[],trend).get(tx.id)).toMatchObject({included:false,review:false,reason:purpose==='reserve'?'Категорію не обрано для резерву':'Категорію не обрано для щоденних витрат'})
 })
})
