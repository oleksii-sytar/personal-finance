import type {Transaction} from '@/types/domain'
import {parseDelimited,parseAmount,normalizeDate} from '@/lib/import/parse-statement'
export interface LoanProfile {balance_basis?: 'principal'|'estimated_principal'|'total_obligation'|'unknown';schedule_basis?: 'bank'|'estimated'|'unknown';account_id:string;workspace_id:string;tracking_start_date:string;origination_date?:string|null;payment_account_id?:string|null;payoff_quote?:number|null;payoff_quote_date?:string|null;card_minimum?:number|null;card_grace_amount?:number|null;card_planned_amount?:number|null;card_due_date?:string|null;card_statement_date?:string|null;notes?:string|null;updated_at:string}
export interface LoanInstallment {id:string;workspace_id:string;account_id:string;import_id:string;sequence:number;payment_date:string;principal:number;interest:number|null;fees:number|null;insurance:number|null;other:number|null;payment_total:number;principal_balance_after:number|null;source_page:string|null;status:'scheduled'|'historical'|'superseded';created_at:string}
export type ScheduleRow=Pick<LoanInstallment,'payment_date'|'principal'|'interest'|'fees'|'insurance'|'other'|'payment_total'|'principal_balance_after'|'source_page'>
export function parseLoanSchedule(text:string,currency:string){
 const {headers,rows}=parseDelimited(text),keys=headers.map(h=>h.trim().toLowerCase()),errors:string[]=[],parsed:ScheduleRow[]=[]
 const required=['payment_date','principal','payment_total'];for(const key of required)if(!keys.includes(key))errors.push('Немає колонки '+key)
 if(!rows.length)errors.push('Додайте рядки графіка')
 if(rows.length>1000)errors.push('Один графік: до 1000 рядків')
 if(errors.length)return {rows:parsed,errors}
 const seen=new Set<string>()
 rows.forEach((raw,i)=>{
  const get=(k:string)=>raw[keys.indexOf(k)]?.trim()||''
  const date=normalizeDate(get('payment_date')),principal=parseAmount(get('principal')),total=parseAmount(get('payment_total'))
  if(!date||principal==null||principal<0||total==null||total<=0||total>=1e12){errors.push('Рядок '+(i+2)+': перевірте дату, тіло й загальний платіж');return}
  if(get('currency')&&get('currency').toUpperCase()!==currency){errors.push('Рядок '+(i+2)+': інша валюта');return}
  const components:Record<string,number|null>={}
  for(const key of ['interest','fees','insurance','other','principal_balance_after']){components[key]=get(key)?parseAmount(get(key)):null;if(get(key)&&(components[key]==null||components[key]!<0))errors.push('Рядок '+(i+2)+': некоректне '+key)}
  const known=principal+['interest','fees','insurance','other'].reduce((s,k)=>s+(components[k]||0),0)
  if(Math.round(known*100)>Math.round(total*100))errors.push('Рядок '+(i+2)+': складові більші за платіж')
  const identity=[date,principal,total,components.interest,components.fees,components.insurance,components.other].join('|')
  if(seen.has(identity))errors.push('Рядок '+(i+2)+': повторний рядок; перевірте перекриття фотографій');seen.add(identity)
  parsed.push({payment_date:date,principal,payment_total:total,interest:components.interest,fees:components.fees,insurance:components.insurance,other:components.other,principal_balance_after:components.principal_balance_after,source_page:get('source_page')||null})
 })
 return {rows:parsed,errors}
}
export function unpaidSchedule(rows:LoanInstallment[],transactions:Transaction[],accountId?:string){const paid=new Set(transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&t.loanInstallmentId).map(t=>t.loanInstallmentId));return rows.filter(r=>r.status==='scheduled'&&(!accountId||r.account_id===accountId)&&!paid.has(r.id)).sort((a,b)=>a.payment_date.localeCompare(b.payment_date)||a.sequence-b.sequence)}
export function payoffScenario(principal:number,future:LoanInstallment[],quote:number|null){const scheduled=future.reduce((s,r)=>s+r.payment_total,0),futureCost=future.reduce((s,r)=>s+r.payment_total-r.principal,0);return {principal,scheduled,futureCost,quote,saving:quote==null?null:Math.round((scheduled-quote)*100)/100}}
export const LOAN_CSV_EXAMPLE='payment_date,currency,principal,interest,fees,insurance,other,payment_total,principal_balance_after,source_page\n2026-10-09,UAH,5200,19,3781,0,0,9000,184800,1\n2026-11-09,UAH,5201,18,3781,0,0,9000,179599,1'
export function loanOcrPrompt(start:string){return 'Оцифруй графік кредиту з прикріплених фотографій або PDF. Початок мого обліку: '+start+'. Не потрібно відновлювати минулі фактичні оплати.\nПереписуй лише видимі дані. Не вигадуй нечіткі суми. Графік є планом, не підтвердженням оплати. Не розраховуй фактичний борг сьогодні зі старого графіка. Поточний залишок тіла, суму дострокового закриття та їхні дати випиши окремо, лише якщо вони явно наведені. Не включай ПІБ, номери договорів, карток, адреси чи підписи.\nПоверни CSV без Markdown: payment_date,currency,principal,interest,fees,insurance,other,payment_total,principal_balance_after,source_page\nДати YYYY-MM-DD, числа без розділювачів тисяч, десяткова крапка. Невідомі значення залиш порожніми. Нуль лише якщо відсутність платежу підтверджена. Для імпорту потрібні точні дата, тіло та загальна сума кожного платежу. Не домислюй розподіл невідомих комісій.\nНе дублюй рядки на фотографіях, що перекриваються. Не змішуй різні версії графіка. Перевір суму складових і підсумки, повідом розбіжності, не виправляй числа самостійно. Збережи минулі рядки як план, не позначай їх сплаченими. Якщо майбутніх сторінок бракує, вкажи це окремо.'}