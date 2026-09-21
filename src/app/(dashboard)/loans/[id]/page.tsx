import {LoanDetail} from '@/components/loans/loan-detail'

export default async function LoanPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 return <LoanDetail accountId={id}/>
}