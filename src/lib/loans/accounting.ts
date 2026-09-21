import type {Transaction} from '@/types/domain'
import type {LoanProfile} from '@/lib/loans/model'
export type LoanBasis='confirmed'|'estimated'|'obligation'|'unknown'
export function profileLoanBasis(profile?:LoanProfile):LoanBasis{
 if(profile?.balance_basis==='total_obligation')return 'obligation'
 if(profile?.balance_basis==='estimated_principal'||profile?.schedule_basis==='estimated')return 'estimated'
 if(profile?.balance_basis==='principal'&&profile?.schedule_basis==='bank')return 'confirmed'
 return 'unknown'
}
export const loanBasisLabel=(basis:LoanBasis)=>({confirmed:'Банківський розподіл',estimated:'Орієнтовний розподіл',obligation:'Повне зобов’язання · розподіл невідомий',unknown:'Розподіл потребує уточнення'}[basis])
export function loanPaymentParts(t:Pick<Transaction,'amount'|'loanPrincipal'|'loanComponents'|'loanBasis'>){
 const amount=Math.max(0,t.amount),reduction=Math.min(amount,Math.max(0,t.loanPrincipal||0)),basis=t.loanBasis||'unknown'
 const uncertain=basis==='obligation'||basis==='unknown'
 const components=t.loanComponents||{}
 const service=uncertain?null:Math.max(0,amount-reduction)
 const specified=Math.min(service??amount,Object.values(components).reduce<number>((s,v)=>s+Math.max(0,v||0),0))
 return {basis,reduction,principal:uncertain?null:reduction,service,specified,
  unallocated:Math.max(0,(service??amount)-specified),estimated:basis==='estimated',
  reportedExpense:service??specified}
}

