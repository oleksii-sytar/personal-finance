'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import {familyAccess} from '@/lib/auth/family-access'
import { createClient } from '@/lib/supabase/client'
import { resetRepository } from '@/lib/data'
import { sessionManager } from '@/lib/session/session-manager'
import type { SignInInput, SignUpInput } from '@/lib/validations/auth'

interface AuthResult { data?: any; error?: string }
interface AuthContextType {
  user:User|null; session:Session|null; loading:boolean; isAuthenticated:boolean
  signIn:(input:SignInInput)=>Promise<AuthResult>
  signUp:(input:SignUpInput)=>Promise<AuthResult>
  signOut:()=>Promise<void>
  resetPassword:(email:string)=>Promise<AuthResult>
  validateSession:()=>Promise<boolean>
}
const AuthContext=createContext<AuthContextType|undefined>(undefined)
function authMessage(error:AuthError):string {
  if(error.status===0 || (error.status || 0)>=500 || /fetch|network|timeout/i.test(error.message)) return 'Сервіс входу тимчасово недоступний. Перевірте інтернет і спробуйте ще раз.'
  if(error.code==='email_not_confirmed') return 'Доступ ще не активовано. Зверніться до власника сім’ї.'
  if(error.status===429 || /rate limit/i.test(error.message)) return 'Забагато спроб. Зачекайте кілька хвилин і повторіть.'
  if(error.code==='invalid_credentials') return 'Неправильна електронна адреса або пароль.'
  if(error.code==='user_already_exists') return 'Обліковий запис уже існує. Увійдіть зі своїм паролем.'
  return 'Не вдалося виконати запит. Спробуйте ще раз.'
}
export function AuthProvider({children}:{children:ReactNode}) {
  const db=createClient()
  const qc=useQueryClient()
  const [session,setSession]=useState<Session|null>(null)
  const [loading,setLoading]=useState(true)
  const userId=useRef<string|null>(null)
  const accept=useCallback((next:Session|null)=>{
    const nextId=next?.user.id || null
    if(userId.current!==nextId) { qc.clear(); resetRepository(); userId.current=nextId }
    setSession(next); setLoading(false); sessionManager.setSession(next)
  },[qc])
  useEffect(()=>{
    let mounted=true
    const {data:{subscription}}=db.auth.onAuthStateChange((_event,next)=>{if(mounted) accept(next)})
    db.auth.getSession().then(({data})=>{if(mounted) accept(data.session)}).catch(()=>{if(mounted) accept(null)})
    return ()=>{mounted=false;subscription.unsubscribe()}
  },[db.auth,accept])
  const validateSession=useCallback(async()=>{
    const {data,error}=await db.auth.getSession()
    if(error){if(error.status && error.status<500) accept(null);return false}
    accept(data.session);return !!data.session
  },[db.auth,accept])
  async function signIn(input:SignInInput):Promise<AuthResult> {
    try {
      const {data,error}=await db.auth.signInWithPassword({email:input.email.trim(),password:input.password})
      if(error) return {error:authMessage(error)}
      accept(data.session);return {data}
    } catch {return {error:'Немає з’єднання із сервісом входу. Спробуйте ще раз.'}}
  }
  async function signUp(input:SignUpInput):Promise<AuthResult> {
    try {
      if(!input.invitationToken)return {error:'Потрібне приватне запрошення від власника сім’ї.'}
      await familyAccess({action:'register',token:input.invitationToken,email:input.email,fullName:input.fullName,password:input.password})
      return signIn({email:input.email,password:input.password,rememberMe:false})
    }catch(e){return {error:e instanceof Error?e.message:'Не вдалося приєднатися.'}}
  }
  const signOut=useCallback(async()=>{
    try{await db.auth.signOut()}finally{accept(null);qc.clear();resetRepository()}
  },[db.auth,accept,qc])
  async function resetPassword(_email:string):Promise<AuthResult> {
    return {error:'Листи для відновлення вимкнені. Використайте збережений пароль або зверніться до власника сім’ї.'}
  }
  return <AuthContext.Provider value={{user:session?.user || null,session,loading,isAuthenticated:!!session,signIn,signUp,signOut,resetPassword,validateSession}}>{children}</AuthContext.Provider>
}
export function useAuth(){
  const value=useContext(AuthContext)
  if(!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}