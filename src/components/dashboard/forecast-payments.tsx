'use client'
import {ArrowDownRight,ArrowUpRight} from 'lucide-react'
import {Money} from '@/components/ui/finance-visuals'
import type {CurrencyCode} from '@/types/domain'
import type {buildForecast} from '@/lib/calculations/forecast'
export function ForecastPayments({summary,currency}:{summary:ReturnType<typeof buildForecast>['summary'];currency:CurrencyCode}){
 return <section className="forecast-flow-summary" aria-label="Майбутні транзакції">
  <h3>Майбутні транзакції</h3>
  <div className="forecast-flow-grid">
   <div><span><ArrowUpRight size={16}/>Надходження <small>{summary.incomeCount}</small></span><Money value={summary.income} currency={currency}/></div>
   <div><span><ArrowDownRight size={16}/>Списання <small>{summary.expenseCount}</small></span><Money value={summary.expense} currency={currency}/></div>
  </div>
 </section>
}