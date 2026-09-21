import type {Category,RecurringFrequency,RecurringTransaction,Transaction} from '@/types/domain'
import {convert} from '@/lib/money/fx'

export const FREQUENCIES = [
  {value:'once',label:'Не повторювати'},
  {value:'daily',label:'Щодня'},
  {value:'weekly',label:'Щотижня'},
  {value:'monthly',label:'Щомісяця'},
  {value:'yearly',label:'Щороку'},
] as const
export function validDay(value:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false
  const date=new Date(value+'T12:00:00Z')
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value
}
/** Advance from the original anchor, never from a clamped February date. */
export function recurrenceDate(start:string,frequency:RecurringFrequency,interval:number,index:number):string{
  if(!validDay(start)||!Number.isInteger(interval)||interval<1||interval>120||!Number.isInteger(index)||index<0||index>20000)throw Error('Некоректне повторення')
  const [year,month,day]=start.split('-').map(Number)
  if(frequency==='daily'||frequency==='weekly'){
    const date=new Date(start+'T12:00:00Z')
    date.setUTCDate(date.getUTCDate()+index*interval*(frequency==='weekly'?7:1))
    return date.toISOString().slice(0,10)
  }
  const months=index*interval*(frequency==='yearly'?12:1)
  const date=new Date(Date.UTC(year,month-1+months,1,12))
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,12)).getUTCDate()
  date.setUTCDate(Math.min(day,last))
  return date.toISOString().slice(0,10)
}
export function recurrenceDates(series:Pick<RecurringTransaction,'startDate'|'endDate'|'frequency'|'intervalCount'>,from:string,through:string):string[]{
  if(!validDay(from)||!validDay(through)||through<from)return []
  const end=series.endDate&&series.endDate<through?series.endDate:through
  const start=new Date(series.startDate+'T12:00:00Z'),first=new Date(from+'T12:00:00Z')
  let index=series.frequency==='daily'||series.frequency==='weekly'
    ?Math.max(0,Math.floor((first.getTime()-start.getTime())/86400000/(series.intervalCount*(series.frequency==='weekly'?7:1))))
    :Math.max(0,Math.floor(((first.getUTCFullYear()-start.getUTCFullYear())*12+first.getUTCMonth()-start.getUTCMonth())/(series.intervalCount*(series.frequency==='yearly'?12:1))))
  const result:string[]=[]
  for(let count=0;count<2000;count++,index++){
    const date=recurrenceDate(series.startDate,series.frequency,series.intervalCount,index)
    if(date>end)break
    if(date>=from)result.push(date)
  }
  return result
}
export function nextRepeatDate(sourceDate:string,today:string):string{
  const horizon=recurrenceDate(today,'yearly',1,1)
  const dates=recurrenceDates({startDate:sourceDate,frequency:'monthly',intervalCount:1},today,horizon)
  return dates.find(date=>date>sourceDate)||recurrenceDate(today,'monthly',1,1)
}
export function parsePlanRate(value:string):number|null{
 const text=value.replace(/\s/g,'').replace(',','.')
 if(!/^\d{1,6}(\.\d{1,8})?$/.test(text))return null
 const number=Number(text)
 return Number.isFinite(number)&&number>0&&number<1000000?number:null
}
export function plannedAmount(transaction:Transaction):number{
  if(transaction.status!=='planned'||!transaction.planExchangeMode||!transaction.originalCurrency||!transaction.originalAmount)return transaction.amount
  const value=transaction.planExchangeMode==='manual'
    ?transaction.originalAmount*(transaction.planExchangeRate||0)
    :convert(transaction.originalAmount,transaction.originalCurrency,transaction.currency)
  return Number.isFinite(value)&&value>0?Math.round(value*100)/100:transaction.amount
}
export const isVisiblePlan=(t:Transaction)=>t.status!=='planned'||!t.recurrenceSuspended
export function recurrenceLabel(series:Pick<RecurringTransaction,'frequency'|'intervalCount'>):string{
  if(series.intervalCount===1)return FREQUENCIES.find(f=>f.value===series.frequency)?.label||'Повторення'
  const unit={daily:'дн.',weekly:'тиж.',monthly:'міс.',yearly:'р.'}[series.frequency]
  return 'Кожні '+series.intervalCount+' '+unit
}
export function categoryTransactionsUrl(categoryId:string|null,month:string):string{
  const [year,m]=month.split('-').map(Number)
  const to=new Date(Date.UTC(year,m,0,12)).toISOString().slice(0,10)
  return '/transactions?'+new URLSearchParams({category:categoryId||'none',kind:'expense',from:month+'-01',to}).toString()
}
export const matchesCategory=(t:Pick<Transaction,'categoryId'>,category:string)=>!category||(category==='none'?!t.categoryId:t.categoryId===category)
