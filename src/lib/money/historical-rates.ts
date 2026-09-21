import type {CurrencyCode,ExchangeRate} from '@/types/domain'
import {validDay} from '@/lib/planning/model'
import {localDay,dayNumber,dayString} from '@/lib/calculations/dates'
const currencies=['UAH','USD','EUR','GBP','PLN']
export async function loadHistoricalRates(from:string,to:string,codes:CurrencyCode[]):Promise<ExchangeRate[]>{
 if(!validDay(from)||!validDay(to)||from>to||to>localDay()||dayNumber(to)-dayNumber(from)>3660||codes.some(c=>!currencies.includes(c)))throw new Error('Некоректний період курсів')
 const result:ExchangeRate[]=[]
 await Promise.all([...new Set(codes)].filter(c=>c!=='UAH').map(async code=>{
  for(let start=dayNumber(from);start<=dayNumber(to);start+=366){
   const end=Math.min(dayNumber(to),start+365),url='https://bank.gov.ua/NBU_Exchange/exchange_site?'+new URLSearchParams({start:dayString(start).replace(/-/g,''),end:dayString(end).replace(/-/g,''),valcode:code,sort:'exchangedate',order:'asc',json:''})
   const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(10000)})
   if(!response.ok)throw new Error('Історичні курси НБУ недоступні')
   const rows=await response.json();if(!Array.isArray(rows))throw new Error('Некоректна відповідь НБУ')
   for(const row of rows){const date=String(row.exchangedate).split('.').reverse().join('-'),rate=Number(row.rate_per_unit??row.rate/Number(row.units||1));if(row.cc===code&&validDay(date)&&date>=from&&date<=to&&Number.isFinite(rate)&&rate>0)result.push({currency:code,date,rate})}
  }
 }))
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.currency.localeCompare(b.currency))
}