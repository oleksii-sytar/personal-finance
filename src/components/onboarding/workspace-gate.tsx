'use client'
import {useState} from 'react'
import {useSearchParams} from 'next/navigation'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useAuth} from '@/contexts/auth-context'
import {createClient} from '@/lib/supabase/client'
import {getFamilyMembership,financeError} from '@/lib/data/supabase-repository'
import {resetRepository} from '@/lib/data'
import {PREVIEW_NO_AUTH} from '@/lib/auth/preview'
import {Card} from '@/components/ui/Card'
import {Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'
export function WorkspaceGate({children}:{children:React.ReactNode}){
 const {user,signOut}=useAuth(),params=useSearchParams(),qc=useQueryClient()
 const [invitation,setInvitation]=useState(params.get('invite')||''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const membership=useQuery({queryKey:['membership',user?.id],queryFn:getFamilyMembership,enabled:!!user&&!PREVIEW_NO_AUTH,retry:1})
 async function join(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const value=invitation.trim(),token=value.includes('/')?new URL(value).searchParams.get('invite'):value;if(!token||!/^[0-9a-f-]{36}$/i.test(token))throw new Error('Вставте код або посилання-запрошення.');const {error}=await createClient().rpc('finance_accept_invite',{p_token:token});if(error)financeError(error);resetRepository();await qc.invalidateQueries()}catch(e){setError(e instanceof Error?e.message:'Не вдалося приєднатися')}finally{setBusy(false)}}
 if(PREVIEW_NO_AUTH||membership.data)return <>{children}</>
 if(membership.isLoading)return <main className="grid min-h-screen place-items-center" role="status">Відкриваємо вашу сім’ю…</main>
 return <main className="mx-auto max-w-lg px-4 py-16"><Card><h1 className="mb-4 text-2xl font-semibold">Приватний сімейний доступ</h1>
 {membership.isError?<><p role="alert">{membership.error.message}</p><Button onClick={()=>membership.refetch()}>Спробувати ще раз</Button></>:<form onSubmit={join} className="space-y-4"><p className="text-sm text-secondary">Власник сім’ї створює запрошення в налаштуваннях. Листи не надсилаються. Увійдіть саме з логіном, для якого створено запрошення.</p><Input label="Посилання або код запрошення" value={invitation} onChange={e=>setInvitation(e.target.value)} required/>{error&&<p role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?'Приєднуємо…':'Приєднатися до сім’ї'}</Button></form>}
 <Button variant="ghost" className="mt-4" onClick={()=>signOut()}>Вийти</Button></Card></main>
}
