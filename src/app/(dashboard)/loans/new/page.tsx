'use client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {AccountForm} from '@/components/accounts/account-form'
import {Card} from '@/components/ui/Card'
import {PageHeader} from '@/components/layout/page-header'
export default function NewLoanPage(){
 const {can}=useWorkspaceContext(),router=useRouter()
 if(!can('account.manage'))return <p role="status">Створення кредитів доступне власнику та фінансовому менеджеру сім’ї.</p>
 return <div className="mx-auto max-w-xl"><Link className="mb-4 inline-block text-sm text-secondary" href="/loans">Кредити та борги</Link><PageHeader title="Новий кредит або борг" subtitle="Вкажіть поточну суму боргу за даними банку"/><Card><AccountForm initialType="bank_loan" onDone={()=>router.push('/loans')}/></Card></div>
}
