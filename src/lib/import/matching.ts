import type {Account,Transaction} from '@/types/domain'
import {bankLegAmount} from '@/lib/reconciliation/model'
import {isAfterBalanceAnchor,transactionEffect} from '@/lib/money/balances'
const day=(s:string)=>Date.parse(s.slice(0,10)+'T00:00:00Z')/86400000
const cents=(n:number)=>Math.round(n*100)
const words=(s:string)=>new Set(s.toLocaleLowerCase('uk').split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2))
export interface MatchCandidate {transaction:Transaction;reasons:string[];score:number}
export function manualCandidates(row:{date:string;amount:number;description:string;occurredAt?:string|null},accountId:string,currency:string,existing:Transaction[]):MatchCandidate[]{
 const kind=row.amount<0?'expense':'income',amount=Math.abs(row.amount),tokens=words(row.description)
 return existing.filter(t=>!t.deletedAt&&t.status==='completed'&&((t.kind!=='transfer'&&!t.importBatchId&&!t.importKey&&t.kind===kind&&t.accountId===accountId&&t.currency===currency)||(t.kind==='transfer'&&((kind==='expense'&&t.accountId===accountId&&t.currency===currency&&!t.importKey)||(kind==='income'&&t.counterAccountId===accountId&&!t.counterImportKey))))).flatMap(t=>{
  const days=Math.abs(day(t.transactionDate)-day(row.date)),difference=Math.abs(cents(bankLegAmount(t,accountId))-cents(amount))
  if((t.kind==='transfer'&&difference!==0)||days>2||!Number.isFinite(days)||difference>100||(difference>0&&cents(t.amount)%100!==0)||(!!t.loanAccountId&&(days!==0||difference!==0)))return []
  const shared=[...words(t.description)].some(w=>tokens.has(w)),reasons=[days===0?'Той самий день':'Дата відрізняється на '+days+' дн.',difference===0?'Сума збігається':'Різниця '+(difference/100).toFixed(2)+'; ручна сума без копійок']
  if(t.kind==='transfer')reasons.push('Уже записаний власний переказ: другий рух грошей не створюється')
  if(shared)reasons.push('Схожий опис')
  if(t.loanAccountId)reasons.push('Платіж кредиту: розбивка збережеться')
  let score=100-days*20-difference/10+(shared?20:0)
  if(row.occurredAt&&t.occurredAt){const seconds=Math.abs(Date.parse(row.occurredAt)-Date.parse(t.occurredAt))/1000;if(Number.isFinite(seconds)){if(seconds>600)return [];score+=20;reasons.push('Час близький')}}
  return [{transaction:t,reasons,score}]
 }).sort((a,b)=>b.score-a.score).slice(0,5)
}
export function reconciliationHints(account:Account,transactions:Transaction[],gap:number){
 if(!Number.isFinite(gap)||Math.abs(gap)<0.01)return []
 const rows=transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&isAfterBalanceAnchor(t,account)&&(t.accountId===account.id||t.counterAccountId===account.id||t.loanAccountId===account.id)).slice(0,1000)
 const hints:Array<{ids:string[];label:string;explanation:string}>=[]
 for(const t of rows){const effect=transactionEffect(t,account);if(cents(-effect)===cents(gap))hints.push({ids:[t.id],label:t.description,explanation:'Скасування впливу цієї операції дорівнює різниці. Це підказка, не доказ дубля.'});else if(cents(effect)===cents(gap))hints.push({ids:[t.id],label:t.description,explanation:'Різниця дорівнює впливу такої операції. Можливо, бракує схожого платежу; не додавайте його без перевірки.'})}
 const recent=rows.slice(0,200)
 for(let i=0;i<recent.length&&hints.length<8;i++)for(let j=i+1;j<recent.length&&hints.length<8;j++)if(cents(-transactionEffect(recent[i],account)-transactionEffect(recent[j],account))===cents(gap))hints.push({ids:[recent[i].id,recent[j].id],label:recent[i].description+' + '+recent[j].description,explanation:'Сума впливів двох записів може пояснити розбіжність. Перевірте виписку та дати.'})
 return hints.slice(0,6)
}
export function transferCandidates(transactions:Transaction[]){
 const rows=transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&!t.loanAccountId),out:Array<{expense:Transaction;income:Transaction}>=[]
 for(const expense of rows.filter(t=>t.kind==='expense'||t.kind==='transfer'))for(const income of rows.filter(t=>t.kind==='income')){
  if(out.length>=30)return out
  if((expense.kind==='transfer'?expense.counterAccountId===income.accountId&&cents(expense.counterAmount??expense.amount)===cents(income.amount):expense.accountId!==income.accountId&&expense.currency===income.currency&&cents(expense.amount)===cents(income.amount))&&Math.abs(day(expense.transactionDate)-day(income.transactionDate))<=2)out.push({expense,income})
 }return out
}