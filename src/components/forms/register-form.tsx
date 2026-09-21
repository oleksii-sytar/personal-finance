'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter,useSearchParams} from 'next/navigation'
import {Button} from '@/components/ui/Button'
import {Input} from '@/components/ui/Input'
import {Card} from '@/components/ui/Card'
import {useAuth} from '@/contexts/auth-context'
import {SignupNavigationHandler} from '@/components/shared/auth-navigation-handler'
import {signUpSchema} from '@/lib/validations/auth'
import {familyAccess} from '@/lib/auth/family-access'
export function RegisterForm(){
 const params=useSearchParams(),router=useRouter(),{signUp}=useAuth()
 const token=params.get('invite')||''
 const [invite,setInvite]=useState(''),[email,setEmail]=useState(''),[family,setFamily]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!!token)
 useEffect(()=>{let active=true;setEmail('');setError('');if(!token){setLoading(false);return}setLoading(true);familyAccess({action:'inspect',token}).then(data=>{if(active){setEmail(data.email);setFamily(data.familyName)}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[token])
 function openInvite(e:React.FormEvent){e.preventDefault();try{const value=invite.trim();const id=value.includes('/')?new URL(value).searchParams.get('invite'):value;if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Вставте посилання або код запрошення.');router.replace('/auth/signup?invite='+encodeURIComponent(id))}catch(e){setError(e instanceof Error?e.message:'Некоректне запрошення')}}
 async function submit(e:React.FormEvent){e.preventDefault();setError('');const parsed=signUpSchema.safeParse({email,password,confirmPassword:confirm,fullName:name,invitationToken:token});if(!parsed.success){setError(parsed.error.issues[0].message);return}setBusy(true);try{const result=await signUp(parsed.data);if(result.error)setError(result.error)}finally{setBusy(false)}}
 return <><SignupNavigationHandler/><Card><h1 className="text-2xl font-semibold">Приєднатися до сім’ї</h1><p className="mt-2 text-sm text-secondary">Приватний сімейний облік. Реєстрація лише за запрошенням, без листів і підтвердження пошти.</p>
 {!token?<form onSubmit={openInvite} className="mt-5 space-y-4"><Input label="Посилання або код запрошення" value={invite} onChange={e=>setInvite(e.target.value)} required/><Button type="submit">Відкрити запрошення</Button><p className="text-xs text-muted">Власник створює посилання в налаштуваннях сім’ї та передає його особисто.</p></form>:loading?<p className="mt-5" role="status">Перевіряємо запрошення…</p>:email?<form onSubmit={submit} className="mt-5 space-y-4"><p className="font-medium">{family}</p><Input label="Електронна адреса (логін)" type="email" value={email} readOnly autoComplete="username"/><Input label="Ім’я та прізвище" value={name} onChange={e=>setName(e.target.value)} required autoComplete="name" maxLength={100}/><Input label="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password"/><Input label="Підтвердження пароля" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password"/><p className="text-xs text-muted">Від 8 символів, хоча б одна латинська літера та цифра. Збережіть пароль у менеджері паролів: відновлення через листи вимкнене.</p><Button type="submit" disabled={busy} className="w-full">{busy?'Приєднуємо…':'Приєднатися'}</Button></form>:null}
 {error&&<p role="alert" className="mt-4 text-sm text-[var(--accent-error)]">{error}</p>}
 <Link className="mt-5 inline-block text-sm text-[var(--accent-primary)]" href={'/auth/login'+(token?'?returnUrl='+encodeURIComponent('/dashboard?invite='+token):'')}>Уже маєте обліковий запис? Увійти</Link>
 </Card></>
}
