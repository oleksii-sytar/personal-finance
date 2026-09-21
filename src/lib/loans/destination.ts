import type {Account,Transaction} from '@/types/domain'

export const LOAN_PAYMENT_CATEGORY='Обслуговування кредитів'
export interface LoanDestination {accountId:string;installmentId:string|null}
export const isLoanDestination=(a:Account)=>!a.archivedAt&&['bank_loan','microloan','mortgage','personal_debt'].includes(a.type)
export function transactionDestination(t?:Transaction|null):LoanDestination|null{
 return t?.loanAccountId?{accountId:t.loanAccountId,installmentId:t.loanInstallmentId||null}:null
}
export const emptyDestination=(accountId:string):LoanDestination=>({accountId,installmentId:null})
export function destinationPatch(d:LoanDestination|null):Partial<Transaction>{
 return {loanAccountId:d?.accountId||null,loanInstallmentId:d?.installmentId||null,loanPrincipal:0,loanComponents:{},loanBasis:null}
}
export function destinationChanged(t:Transaction,d:LoanDestination|null){
 return (t.loanAccountId||null)!==(d?.accountId||null)||(t.loanInstallmentId||null)!==(d?.installmentId||null)
}
