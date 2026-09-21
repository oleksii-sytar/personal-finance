import {statisticalAmounts} from '@/lib/money/statistical'
import type {Account, UserSettings, WorkspaceMember, Transaction} from '@/types/domain'
export function parseEntryAmount(value:string):number|null {
 const s=value.trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.')
 if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null
 const n=Number(s);return Number.isFinite(n)&&n>0&&n<1e12?n:null
}
export function accountOwner(account:Account,members:WorkspaceMember[]):string {
 if(account.isShared)return 'Спільний рахунок'
 if(!account.ownerUserId)return 'Власника не вказано'
 return members.find(m=>m.userId===account.ownerUserId)?.displayName||'Учасник сім’ї'
}
export function preferredAccounts(accounts:Account[],settings?:UserSettings){
 const favorites=settings?.favoriteAccountIds||[]
 return [...accounts].filter(a=>!a.archivedAt).sort((a,b)=>{
  const rank=(x:Account)=>x.id===settings?.defaultAccountId?-2:favorites.includes(x.id)?favorites.indexOf(x.id):1000
  return rank(a)-rank(b)||a.name.localeCompare(b.name,'uk')
 })
}
export function expenseAmount(t:Transaction){return statisticalAmounts(t).expense}