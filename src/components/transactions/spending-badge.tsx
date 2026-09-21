import type {SpendingMembership} from '@/lib/calculations/spending-membership'
export function SpendingBadge({value,purpose='forecast'}:{value?:SpendingMembership;purpose?:'forecast'|'reserve'}){
 if(!value)return <span className="block text-xs text-muted">Щоденні витрати: завантажуємо розрахунок…</span>
 const label=purpose==='reserve'?'Резерв':'Щоденні витрати'
 return <span className={'mt-1 block text-xs '+(value.included?'text-[var(--accent-success)]':'text-muted')} title={value.reason}>
  {label}: {value.included?'враховано':'не враховано'}{value.review?' · перегляньте':''}
  {!value.included&&<span className="block text-muted">{value.reason}</span>}
 </span>
}
