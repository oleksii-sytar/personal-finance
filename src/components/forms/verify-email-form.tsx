'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {Card,CardTitle} from '@/components/ui/Card'
import {Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'
import {createClient} from '@/lib/supabase/client'
import {VerifyEmailNavigationHandler} from '@/components/shared/auth-navigation-handler'
export function VerifyEmailForm(){
  const params=useSearchParams()
  const [email,setEmail]=useState(params.get('email') || '')
  const [message,setMessage]=useState(params.get('error')?'Посилання недійсне або застаріле. Запросіть нове.':'Ми надіслали лист для підтвердження. Перейдіть за посиланням у ньому, а потім створіть свою сім’ю.')
  const [busy,setBusy]=useState(false)
  async function resend(e:React.FormEvent){
    e.preventDefault();setBusy(true)
    try{
      const {error}=await createClient().auth.resend({type:'signup',email,options:{emailRedirectTo:window.location.origin+'/auth/callback'}})
      setMessage(error?'Не вдалося надіслати лист. Перевірте адресу або спробуйте трохи пізніше.':'Якщо адреса очікує підтвердження, новий лист надіслано. Перевірте також спам.')
    }catch{setMessage('Немає з’єднання. Спробуйте ще раз.')}finally{setBusy(false)}
  }
  return <Card className="mx-auto w-full max-w-md"><VerifyEmailNavigationHandler/><CardTitle as="h1" className="mb-4 text-2xl">Перевірте електронну пошту</CardTitle><p role="status" className="mb-5 text-sm text-secondary">{message}</p><form onSubmit={resend} className="space-y-4"><Input type="email" label="Електронна пошта" value={email} onChange={e=>setEmail(e.target.value)} required/><Button disabled={busy} type="submit" className="w-full">{busy?'Надсилаємо…':'Надіслати лист повторно'}</Button></form><Link className="mt-5 inline-block text-sm text-[var(--accent-primary)]" href="/auth/login">До входу</Link></Card>
}