import {localDay} from '@/lib/calculations/dates'
import type {Account,Transaction} from '@/types/domain'
export function parseSignedBalance(value:unknown):number|null {
 if(typeof value!=='string'&&typeof value!=='number')return null
 const s=String(value).replace(/[\s\u00a0\u202f]/g,'').replace(/−/g,'-').replace(',','.')
 if(!/^[+-]?\d+(\.\d{1,2})?$/.test(s))return null
 const n=Number(s);return Number.isFinite(n)&&Math.abs(n)<1e12?n:null
}
export const needsReview=(t:Transaction)=>!t.deletedAt&&t.status==='completed'&&(t.reviewRequired===true||(t.kind!=='transfer'&&!t.categoryId))
export function verifiedAt(t:Transaction,accountId:string):string|null{return (t.accountId===accountId?t.accountVerifiedAt:t.counterAccountId===accountId?t.counterVerifiedAt:t.loanAccountId===accountId?t.loanVerifiedAt:null)||null}
export const touchesAccount=(t:Transaction,id:string)=>t.accountId===id||t.counterAccountId===id||t.loanAccountId===id
/** A linked manual debt is not a second bank movement. */
export const pendingForAccount=(t:Transaction,id:string)=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=localDay()&&(t.accountId===id||t.kind==='transfer'&&t.counterAccountId===id)&&!verifiedAt(t,id)
export const hasConfirmation=(t:Transaction)=>!!(t.accountVerifiedAt||t.counterVerifiedAt||t.loanVerifiedAt)
export interface VerificationAccountNames {accountName?:string;counterAccountName?:string;loanAccountName?:string}
/** Bank confirmation belongs to each affected account, not to execution or categorization. */
export function transactionBalanceStatus(t:Transaction,names:VerificationAccountNames={}){
 const legs=[{name:names.accountName||(t.kind==='income'?'рахунок зарахування':'рахунок списання'),at:t.accountVerifiedAt},
  ...(t.kind==='transfer'?[{name:names.counterAccountName||'рахунок одержувача',at:t.counterVerifiedAt}]:[])]
 const pending=legs.filter(leg=>!leg.at).map(leg=>leg.name),total=legs.length,confirmed=total-pending.length,verified=confirmed===total
 const label=verified?(total>1?'Залишки звірено':'Залишок звірено'):confirmed?'Не звірено: '+pending.join(', '):total>1?'Залишки не звірено':'Залишок не звірено'
 const description=verified?(total>1?'Залишки обох рахунків підтверджено.':'Залишок підтверджено.'):confirmed?'Підтверджено '+confirmed+' із '+total+' рахунків. Не звірено: '+pending.join(', ')+'.':'Залишки ще не підтверджено. Не звірено: '+pending.join(', ')+'.'
 return {verified,confirmed,total,label,description:description+' Це звірка залишків, а не статус виконання транзакції.'}
}
export function verificationLabel(t:Transaction){return transactionBalanceStatus(t).description}
export type VerificationDataState='ready'|'loading'|'error'
export interface AccountVerificationStatus {confirmed:boolean;pendingCount:number|null;label:string;tone:'success'|'warning'|'neutral';state:'verified'|'pending'|'unverified'|'loading'|'error'}
/** A historical confirmation date alone cannot confirm today's account balance. */
export function accountVerificationStatus(a:Account,transactions:Transaction[]|undefined,dataState:VerificationDataState='ready'):AccountVerificationStatus{
 if(dataState==='error')return {confirmed:false,pendingCount:null,label:'Статус звірки недоступний',tone:'neutral',state:'error'}
 if(dataState==='loading'||!transactions)return {confirmed:false,pendingCount:null,label:'Перевіряємо статус…',tone:'neutral',state:'loading'}
 const pendingCount=transactions.filter(t=>pendingForAccount(t,a.id)).length
 if(pendingCount){
  const mod10=pendingCount%10,mod100=pendingCount%100,word=mod10===1&&mod100!==11?'транзакція':mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?'транзакції':'транзакцій'
  return {confirmed:false,pendingCount,label:'Не звірено: '+pendingCount+' '+word,tone:'warning',state:'pending'}
 }
 if(!a.lastReconciledAt)return {confirmed:false,pendingCount:0,label:'Залишок ще не звірено',tone:'warning',state:'unverified'}
 return {confirmed:true,pendingCount:0,label:'Підтверджено '+new Date(a.lastReconciledAt).toLocaleDateString('uk-UA',{timeZone:'Europe/Kyiv'}),tone:'success',state:'verified'}
}
export const bankLegAmount=(t:Transaction,accountId:string)=>t.kind==='transfer'&&t.counterAccountId===accountId?(t.counterAmount??t.amount):t.amount
export function financialChange(a:Transaction,b:Partial<Transaction>){return (['kind','accountId','counterAccountId','amount','counterAmount','currency','transactionDate','status','deletedAt'] as const).some(k=>k in b&&(a[k]??null)!==(b[k]??null))}
export const reliableTrend=(t:{confidence?:string;hasHistory?:boolean;partialDay?:boolean;days?:number;sampleCount?:number;unknownAccounts?:number})=>t.confidence==='history'
export function transferPartners(t:Transaction,source:string,destination:string,rows:Transaction[]){
 return rows.filter(b=>b.id!==t.id&&!b.deletedAt&&b.status==='completed'&&!b.loanAccountId&&Math.abs(Date.parse(t.transactionDate)-Date.parse(b.transactionDate))<=2*86400000&&(
 t.kind==='transfer'?(b.kind==='income'&&b.accountId===destination&&b.amount===(t.counterAmount??t.amount))||(b.kind==='expense'&&b.accountId===source&&b.amount===t.amount&&b.currency===t.currency):
 t.kind==='expense'?(b.kind==='income'&&b.accountId===destination&&(b.currency!==t.currency||b.amount===t.amount))||(b.kind==='transfer'&&b.accountId===source&&b.counterAccountId===destination&&b.amount===t.amount):
 (b.kind==='expense'&&b.accountId===source&&(b.currency!==t.currency||b.amount===t.amount))||(b.kind==='transfer'&&b.accountId===source&&b.counterAccountId===destination&&(b.counterAmount??b.amount)===t.amount)))
}
