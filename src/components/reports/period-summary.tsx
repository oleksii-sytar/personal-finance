import type {ReactNode} from 'react'
import {ArrowUpRight,ArrowDownRight} from 'lucide-react'
import {Money,StatusPill,InfoButton} from '@/components/ui/finance-visuals'
import type {MonthlyTotals} from '@/lib/calculations/reports'
import type {reportQuality} from '@/lib/money/statistical'
import type {CurrencyCode} from '@/types/domain'

export function PeriodSummary({title,totals,currency,hasData,children,quality,coverageComplete=false}:{title:string;totals:MonthlyTotals;currency:CurrencyCode;hasData:boolean;children?:ReactNode;quality?:ReturnType<typeof reportQuality>;coverageComplete?:boolean}){
 const incomplete=quality?.incomplete??!!(quality?.unallocated.length||quality?.missingRates.length)
 const estimated=!!quality?.estimated?.length
 const label=incomplete?'Неповні дані':estimated?'Орієнтовний результат':coverageComplete?'Історію підтверджено':hasData?'За внесеними даними':'Без транзакцій'
 return <section className="finance-surface report-summary" aria-label={title}>
  <div className="finance-card-heading"><h2>{title}</h2><div className="flex items-center gap-2">
   <StatusPill tone={incomplete||estimated?'warning':'neutral'}>{label}</StatusPill>
   <InfoButton title="Як рахується результат"><p>Доходи мінус витрати за обраний період. Це не залишок грошей на рахунках.</p><p>Плани, початкові залишки та власні перекази не додаються до результату. Покупку з кредитки враховуємо один раз; повернення тіла боргу не є повторною витратою.</p><p>Відсотки та комісії враховані за збереженим розподілом. Орієнтовний розподіл дає орієнтовний результат. Якщо частина витрат справді невідома, остаточний результат не показуємо.</p>
    {!!quality?.componentGaps?.length&&<p>У {quality.componentGaps.length} кредитних платежах є сума обслуговування без деталізації на відсотки та комісії. Вона вже врахована у витратах, не загублена.</p>}
   </InfoButton></div></div>
  {!hasData?<div className="report-no-data">Немає даних</div>:incomplete?<div className="report-no-data">Потрібне уточнення</div>:<div className="flex items-baseline gap-2">{estimated&&<span aria-label="Орієнтовно" className="text-2xl">≈</span>}<Money value={totals.net} currency={currency} signed className={'money-hero'+(!estimated&&totals.net>0?' money-good':'')}/></div>}
  <p className="finance-caption">{incomplete?'Результат ще не визначено':'Доходи мінус витрати'}</p>
  <div className="report-income-expense">
   {([{label:incomplete?'Відомі доходи':'Доходи',value:totals.income,Icon:ArrowUpRight,color:'var(--accent-success)'},{label:incomplete?'Відомі витрати':estimated?'Витрати ≈':'Витрати',value:totals.expense,Icon:ArrowDownRight,color:'var(--accent-primary)'}]).map(({label,value,Icon,color})=><div key={label}>
    <span><Icon size={15}/>{label}</span>{hasData?<Money value={value} currency={currency}/>:<strong>Немає даних</strong>}
    <div className="report-track"><i style={{width:value/Math.max(1,totals.income,totals.expense)*100+'%',background:color}}/></div>
   </div>)}
  </div>
  {incomplete?<p className="finance-caption report-quality-note">{quality?.unallocated.length?'Невідомий розподіл: '+quality.unallocated.length+' кредитних платежів. ':''}{quality?.missingRates.length?'Немає історичного курсу: '+quality.missingRates.length+' транзакцій. ':''}Невідомі суми не вважаємо нульовими.</p>:estimated?<p className="finance-caption report-quality-note">Включено орієнтовне обслуговування кредитів: {quality?.estimated.length} платежі. Після уточнення розподілу оцінка оновиться.</p>:null}
  {children}
 </section>
}