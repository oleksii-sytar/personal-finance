'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Card,CardTitle} from '@/components/ui/Card'
import {Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'
import {createClient} from '@/lib/supabase/client'
export function ResetPasswordConfirmForm(){
  const router=useRouter()
  const [password,setPassword]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function save(e:React.FormEvent){
    e.preventDefault();setError('')
    if(password.length<8 || !/[a-zA-Zа-яА-ЯіІїЇєЄ]/.test(password) || !/[0-9]/.test(password)){setError('Пароль має містити щонайменше 8 символів, літеру й цифру.');return}
    if(password!==confirmation){setError('Паролі не збігаються.');return}
    setBusy(true)
    try{
      const db=createClient()
      const {data:{user}}=await db.auth.getUser()
      if(!user)throw new Error('Посилання застаріле. Запросіть новий лист для відновлення.')
      const {error}=await db.auth.updateUser({password})
      if(error)throw error
      router.replace('/dashboard')
    }catch(e){setError(e instanceof Error?e.message:'Не вдалося оновити пароль.')}finally{setBusy(false)}
  }
  return <Card className="mx-auto w-full max-w-md"><CardTitle as="h1" className="mb-5 text-2xl">Новий пароль</CardTitle><form onSubmit={save} className="space-y-4"><Input type="password" autoComplete="new-password" label="Новий пароль" value={password} onChange={e=>setPassword(e.target.value)} required/><Input type="password" autoComplete="new-password" label="Підтвердіть пароль" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required/>{error&&<p role="alert" className="text-sm text-[var(--accent-error)]">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy?'Зберігаємо…':'Оновити пароль'}</Button></form></Card>
}