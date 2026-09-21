/**
 * Reporting selectors. Pure functions over transactions, converting amounts to
 * a chosen display currency. Planned and deleted rows are excluded.
 */

import type { Category, CurrencyCode, Transaction } from '@/types/domain'
import {historicalValue,statisticalAmounts,countedActual,type ReportOptions} from '@/lib/money/statistical'
import {localDay} from './dates'
import {plannedAmount,isVisiblePlan} from '@/lib/planning/model'

function inMonth(dateStr:string,year:number,month0:number){return dateStr.startsWith(year+'-'+String(month0+1).padStart(2,'0')+'-')}
const isCounted=countedActual

export interface MonthlyTotals {
  income: number
  expense: number
  net: number
}

export function monthlyTotals(
  transactions: Transaction[],
  year: number,
  month0: number,
  displayCurrency: CurrencyCode,
  options:ReportOptions={}
): MonthlyTotals {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!isCounted(t,options.reference) || !inMonth(t.transactionDate, year, month0)) continue
    const parts=statisticalAmounts(t)
    income += historicalValue(parts.income,t.currency,displayCurrency,t.transactionDate,options.rates)??0
    expense += historicalValue(parts.expense,t.currency,displayCurrency,t.transactionDate,options.rates)??0
  }
  return { income, expense, net: income - expense }
}

export interface CategorySpend {
  categoryId: string | null
  name: string
  color: string
  total: number
  pct: number
}

export interface CashflowForecastSummary {
  monthName: string
  year: number
  month0: number
  actualIncome: number
  actualExpense: number
  actualNet: number
  plannedIncome: number
  plannedExpense: number
  remainingDays: number
  dayOfMonth: number
  daysInMonth: number
  projectedIncome: number
  projectedExpense: number
  projectedNet: number
  usedPaceFromHistory: boolean
}

export interface MonthlyCashflowPoint {
  month0: number
  monthName: string
  income: number
  expense: number
  net: number
}

export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month0: number,
  displayCurrency: CurrencyCode,
  options:ReportOptions={}
): CategorySpend[] {
  const totals = new Map<string | null, number>()
  for (const t of transactions) {
    if (!isCounted(t,options.reference) || t.kind !== 'expense' || !inMonth(t.transactionDate, year, month0)) continue
    const value = historicalValue(statisticalAmounts(t).expense,t.currency,displayCurrency,t.transactionDate,options.rates)??0
    const key=t.categoryId??null
    if(value>0)totals.set(key,(totals.get(key)??0)+value)
  }
  const grand = Array.from(totals.values()).reduce((a, b) => a + b, 0)
  return Array.from(totals.entries())
    .map(([categoryId, total]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        categoryId,
        name: cat?.name ?? "Без категорії",
        color: cat?.color ?? 'var(--text-muted)',
        total,
        pct: grand > 0 ? (total / grand) * 100 : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Compatibility summary: explicit plans only; income is never extrapolated. */
export function monthlyForecast(transactions:Transaction[],year:number,month0:number,displayCurrency:CurrencyCode,reference=new Date()):CashflowForecastSummary {
 const actual=monthlyTotals(transactions,year,month0,displayCurrency,{reference}),today=localDay(reference)
 const plans=transactions.filter(t=>!t.deletedAt&&t.status==='planned'&&isVisiblePlan(t)&&inMonth(t.transactionDate,year,month0)&&t.transactionDate>=today)
 const total=(kind:'income'|'expense')=>plans.filter(t=>t.kind===kind).reduce((s,t)=>s+(historicalValue(plannedAmount(t),t.currency,displayCurrency,t.transactionDate)??0),0)
 const daysInMonth=new Date(Date.UTC(year,month0+1,0)).getUTCDate(),current=today.startsWith(year+'-'+String(month0+1).padStart(2,'0')),dayOfMonth=current?Number(today.slice(8)):daysInMonth,plannedIncome=total('income'),plannedExpense=total('expense')
 return {monthName:new Intl.DateTimeFormat('uk-UA',{month:'long',year:'numeric'}).format(new Date(year,month0,1)),year,month0,actualIncome:actual.income,actualExpense:actual.expense,actualNet:actual.net,plannedIncome,plannedExpense,remainingDays:daysInMonth-dayOfMonth,dayOfMonth,daysInMonth,projectedIncome:actual.income+plannedIncome,projectedExpense:actual.expense+plannedExpense,projectedNet:actual.net+plannedIncome-plannedExpense,usedPaceFromHistory:false}
}

export function yearlyCashflow(transactions: Transaction[], year: number, displayCurrency: CurrencyCode, options:ReportOptions={}): MonthlyCashflowPoint[] {
  const points: MonthlyCashflowPoint[] = []
  for (let m = 0; m < 12; m++) {
    const totals = monthlyTotals(transactions, year, m, displayCurrency,options)
    points.push({
      month0: m,
      monthName: new Intl.DateTimeFormat('uk-UA', { month: 'short' }).format(new Date(year, m, 1)),
      income: totals.income,
      expense: totals.expense,
      net: totals.net,
    })
  }
  return points
}
