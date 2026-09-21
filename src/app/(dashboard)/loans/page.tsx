import {redirect} from 'next/navigation'
import {LoansDashboard} from '@/components/loans/loan-dashboard'

export default async function LoansPage({searchParams}:{searchParams:Promise<{account?:string}>}){
 const query=await searchParams
 if(typeof query.account==='string'&&query.account)redirect('/loans/'+encodeURIComponent(query.account))
 return <LoansDashboard/>
}
