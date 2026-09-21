import {describe,expect,it} from 'vitest'
import type {Account,Transaction} from '@/types/domain'
import {liquidityForecast,localDay} from '@/lib/calculations/liquidity'

const reference=new Date(2026,8,9,12)
const account=(patch:Partial<Account>={}):Account=>({
  id:'cash',workspaceId:'family',name:'Cash',type:'cash',currency:'UAH',
  openingBalance:1000,currentBalance:1000,isDefault:true,
  createdAt:'2026-09-01',updatedAt:'2026-09-01',...patch,
})
const transaction=(patch:Partial<Transaction>={}):Transaction=>({
  id:'payment',workspaceId:'family',accountId:'cash',kind:'income',
  amount:500,currency:'UAH',description:'Salary',transactionDate:'2026-09-10',
  status:'planned',clearedStatus:'uncleared',createdBy:'user',
  createdAt:'2026-09-01',updatedAt:'2026-09-01',...patch,
})
const forecast=(accounts:Account[],transactions:Transaction[],end='2026-09-24',budget=0)=>
  liquidityForecast(accounts,transactions,'UAH',end,reference,budget)
const lastBalance=(result:ReturnType<typeof forecast>)=>result.points[result.points.length-1]?.balance

describe('dated liquidity forecast',()=>{
  it('counts a salary once instead of extrapolating it every day',()=>{
    const result=forecast([account()],[transaction()])
    expect(result.opening).toBe(1000)
    expect(lastBalance(result)).toBe(1500)
    expect(result.points.filter(p=>p.income!==0)).toHaveLength(1)
  })
  it('excludes savings and borrowed credit from spendable opening cash',()=>{
    const result=forecast([account(),account({id:'save',type:'savings',currentBalance:9000}),
      account({id:'card',type:'credit_card',currentBalance:-2000,creditLimit:50000}),
      account({id:'old',archivedAt:'2026-09-01',currentBalance:8000})],[])
    expect(result.opening).toBe(1000)
  })
  it('does not add completed or deleted entries to the current balance again',()=>{
    const result=forecast([account()],[transaction({status:'completed'}),
      transaction({id:'deleted',deletedAt:'2026-09-09'})])
    expect(lastBalance(result)).toBe(1000)
  })
  it('keeps internal same-currency cash transfers neutral',()=>{
    const result=forecast([account(),account({id:'bank',type:'bank_debit',currentBalance:2000})],
      [transaction({kind:'transfer',counterAccountId:'bank'})])
    expect(lastBalance(result)).toBe(3000)
    expect(result.points.reduce((s,p)=>s+p.income+p.expense,0)).toBe(0)
  })
  it('reduces available cash when moving money into savings or repaying debt',()=>{
    for(const type of ['savings','bank_loan'] as const){
      const result=forecast([account(),account({id:'destination',type,currentBalance:0})],
        [transaction({kind:'transfer',counterAccountId:'destination',amount:300})])
      expect(lastBalance(result)).toBe(700)
    }
  })
  it('uses the actual incoming amount for currency transfers',()=>{
    const result=forecast([account({currentBalance:10000}),account({
      id:'usd',type:'bank_debit',currency:'USD',currentBalance:0})],
      [transaction({kind:'transfer',counterAccountId:'usd',amount:4300,counterAmount:100})])
    expect(lastBalance(result)).toBe(9850)
  })
  it('reports overdue plans separately rather than silently shifting their date',()=>{
    const overdue=transaction({transactionDate:'2026-09-08',kind:'expense'})
    const result=forecast([account()],[overdue])
    expect(result.overdue).toHaveLength(1)
    expect(lastBalance(result)).toBe(1000)
  })
  it('applies additional daily spending starting tomorrow, not twice today',()=>{
    const result=forecast([account()],[],'2026-09-11',100)
    expect(result.points.map(p=>p.balance)).toEqual([1000,900,800])
  })
  it('includes today and selected date, but excludes later payments',()=>{
    const result=forecast([account()],[transaction({transactionDate:'2026-09-09',amount:200}),
      transaction({id:'later',transactionDate:'2026-09-25',amount:900})])
    expect(result.points[0].balance).toBe(1200)
    expect(result.points[result.points.length-1].date).toBe('2026-09-24')
    expect(lastBalance(result)).toBe(1200)
  })
  it('uses local calendar dates without shifting them through UTC',()=>{
    expect(localDay(new Date(2026,8,9,0,1))).toBe('2026-09-09')
  })
})