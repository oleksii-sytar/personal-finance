import Link from 'next/link'
import type {CurrencyCode} from '@/types/domain'
import type {automaticSpending} from '@/lib/calculations/spending-model'
import {exclusionReason} from '@/lib/calculations/spending-membership'
import {formatMoney} from '@/lib/money/format'
import {SPENDING_HISTORY_DAYS} from '@/lib/calculations/history'

type Trend=ReturnType<typeof automaticSpending>
export function SpendingExplanation({trend,currency}:{trend:Trend;currency:CurrencyCode}){
 const purpose=trend.purpose,base='/transactions?purpose='+purpose
 const url=(id:string)=>base+'&ids='+id+'&edit='+id
 return <div className="space-y-4">
  <p>{trend.from} - {trend.to} · {trend.days} завершених днів. Використовуємо не більше {SPENDING_HISTORY_DAYS} днів історії.</p>
  <div className="grid gap-2 sm:grid-cols-3">
   <Link className="rounded-xl border border-primary p-3 finance-link" href={base+'&spending=included'}>Враховано · {trend.ordinary.length}</Link>
   <Link className="rounded-xl border border-primary p-3 finance-link" href={base+'&spending=excluded'}>Не враховано · {trend.exclusions.length}</Link>
   <Link className="rounded-xl border border-primary p-3 finance-link" href={base+'&spending=review'}>Потребують уваги · {trend.reviewRows.length}</Link>
  </div>
  <p>Для кожного рахунку ділимо включені витрати на дні його історії, включно з днями без покупок. Складаємо денні суми. Відомі плани тієї самої витрати враховуємо окремо.</p>
  <dl className="space-y-2"><div><dt>До коригування планами</dt><dd>{formatMoney(trend.cashDailyBase,currency)}/день</dd></div><div><dt>Щоденна оцінка</dt><dd>{formatMoney(trend.daily,currency)}/день</dd></div></dl>
  {trend.method==='ses'&&<p>Застосовано згладжування за результатами порівняння з простим середнім.</p>}
  <Link className="finance-link" href={purpose==='reserve'?'/settings#reserve-categories':'/settings#forecast-categories'}>{purpose==='reserve'?'Категорії резерву':'Категорії щоденних витрат'}</Link>
  {!!trend.reviewRows.length&&<details><summary className="finance-link cursor-pointer">Потребують уваги · {trend.reviewRows.length}</summary><p className="my-2 text-sm">Поки враховані. Велика сума сама по собі не робить витрату разовою.</p><ul className="space-y-3">{trend.reviewRows.map(r=><li key={r.id}><Link className="finance-link" href={url(r.id)}>{r.name}</Link><p className="text-sm">{r.date} · {formatMoney(r.amount,currency)} / {r.days} дн. = {formatMoney(r.daily,currency)}/день</p></li>)}</ul></details>}
  <details><summary className="finance-link cursor-pointer">Усі включені витрати · {trend.ordinary.length}</summary><ul className="mt-3 max-h-96 space-y-3 overflow-auto">{trend.ordinary.map(r=><li key={r.id}><Link className="finance-link" href={url(r.id)}>{r.name}</Link><p className="text-sm">{r.date} · {formatMoney(r.amount,currency)} / {r.days} дн. = {formatMoney(r.daily,currency)}/день</p></li>)}</ul></details>
  <details><summary className="finance-link cursor-pointer">Не включені витрати · {trend.exclusions.length}</summary><ul className="mt-3 max-h-96 space-y-3 overflow-auto">{trend.exclusions.map(r=><li key={r.id}><Link className="finance-link" href={url(r.id)}>{r.name}</Link><p className="text-sm">{r.date} · {exclusionReason(r.reason,purpose)}</p></li>)}</ul></details>
  <details><summary className="finance-link cursor-pointer">За рахунками</summary><ul className="mt-3 space-y-2">{trend.accountBreakdown.filter(r=>r.count>0).map(r=><li key={r.id}><strong>{r.name}</strong><br/>{formatMoney(r.amount,currency)} / {r.days} дн. = {formatMoney(r.daily,currency)}/день</li>)}</ul></details>
  {trend.unknownAccounts>0&&<p>Повноту історії не підтверджено для {trend.unknownAccounts} рахунків. <Link className="finance-link" href="/settings#history-coverage">Уточнити історію</Link></p>}
  {trend.missingFx>0&&<p>Для частини витрат немає курсу на дату. Оцінку тимчасово не застосовуємо.</p>}
  <p className="text-sm text-muted">Виключення з прогнозу не видаляє транзакцію зі статистики. Сьогодні враховуємо лише несплачені плани, щоденну оцінку додаємо відзавтра.</p>
 </div>
}
