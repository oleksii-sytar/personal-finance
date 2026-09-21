'use client'
import {useState} from 'react'
import {useMembers} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {Card,CardTitle} from '@/components/ui/Card'
import {Input} from '@/components/ui/Input'
import {Select} from '@/components/ui/select'
import {Button} from '@/components/ui/Button'
import {createClient} from '@/lib/supabase/client'
import {financeError} from '@/lib/data/supabase-repository'
import {ROLE_LABELS} from '@/lib/auth/permissions'
export function MembersCard(){
  const {data:members=[]}=useMembers()
  const {role}=useWorkspaceContext()
  const [email,setEmail]=useState('')
  const [inviteRole,setRole]=useState('member')
  const [link,setLink]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  async function invite(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage('');setLink('')
    try{const {data,error}=await createClient().rpc('finance_invite',{p_email:email,p_role:inviteRole});if(error)financeError(error);setLink(window.location.origin+'/auth/signup?invite='+data)}
    catch(e){setMessage(e instanceof Error?e.message:'Не вдалося створити запрошення.')}finally{setBusy(false)}
  }
  return <Card><CardTitle className="mb-4">Учасники сім’ї</CardTitle><ul className="mb-5 space-y-3">{members.map(m=><li key={m.id} className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="font-medium text-primary">{m.displayName}</p><p className="break-all text-xs text-muted">{m.email}</p></div><span className="text-xs text-secondary">{ROLE_LABELS[m.role]}</span></li>)}</ul>
    {role==='owner'&&<form onSubmit={invite} className="space-y-3 border-t border-primary pt-5"><h3 className="font-medium text-primary">Запросіть близьку людину</h3><Input type="email" label="Електронна адреса учасника" value={email} onChange={e=>setEmail(e.target.value)} required/><Select label="Роль учасника" value={inviteRole} onChange={e=>setRole(e.target.value)} options={[{value:'manager',label:'Менеджер: керує рахунками й операціями'},{value:'member',label:'Учасник: додає й редагує свої операції'},{value:'viewer',label:'Спостерігач: лише перегляд'}]}/><Button disabled={busy} type="submit">{busy?'Створюємо…':'Створити запрошення'}</Button><p className="text-xs text-muted">Лист автоматично не надсилається. Передайте посилання особисто. Воно діє 7 днів і лише для зазначеної адреси.</p></form>}
    {link&&<div className="mt-4 space-y-2"><Input label="Посилання-запрошення" readOnly value={link}/><Button variant="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Посилання скопійовано.')}catch{setMessage('Скопіюйте посилання з поля вище.')}}}>Копіювати</Button></div>}
    {message&&<p role="status" className="mt-3 text-sm text-secondary">{message}</p>}
  </Card>
}