import {parseDelimited,toParsedRows,type ColumnMapping} from './parse-statement'
import {hasVisibleText} from '@/lib/integrity/text'
export function validateStatement(text:string,mapping:ColumnMapping,currency:string|undefined,today:string){
 const parsed=parseDelimited(text), bankColumn=parsed.headers.findIndex(h=>/^(bank_id|transaction_id|reference_id)$/i.test(h)),currencyColumn=parsed.headers.findIndex(h=>/^(currency|валюта)$/i.test(h))
 const rows=toParsedRows(parsed.rows,mapping,currency).map(r=>({...r,bankReference:bankColumn<0?null:r.raw[bankColumn]?.trim()||null}))
 const counts=new Map<string,number>();for(const r of rows)if(r.bankReference)counts.set(r.bankReference,(counts.get(r.bankReference)||0)+1)
 const result=rows.map(r=>{
  const error=r.error||(r.date>today?'Майбутню операцію не можна імпортувати як виконану':currencyColumn>=0&&r.raw[currencyColumn]?.trim()&&r.raw[currencyColumn].trim().toUpperCase()!==currency?'Валюта рядка не відповідає рахунку':r.bankReference&&(!hasVisibleText(r.bankReference)||r.bankReference.length>200)?'Некоректний банківський ідентифікатор':r.bankReference&&counts.get(r.bankReference)!>1?'Банківський ідентифікатор повторюється у виписці':undefined)
  return {...r,error,valid:!error}
 })
 return {...parsed,rows:result,errors:[...parsed.errors,...(rows.length>5000?['Одна виписка може містити до 5000 операцій']:[])]}
}
