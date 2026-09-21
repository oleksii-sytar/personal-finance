import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidReturnUrl } from '@/lib/utils/return-url'
export async function GET(request:Request){
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const requested=url.searchParams.get('next') || '/dashboard'
  const next=requested==='/auth/reset-password/confirm' || isValidReturnUrl(requested) ? requested : '/dashboard'
  if(code){
    const db=await createClient()
    const {error}=await db.auth.exchangeCodeForSession(code)
    if(!error)return NextResponse.redirect(new URL(next,url.origin))
  }
  return NextResponse.redirect(new URL('/auth/verify-email?error=expired',url.origin))
}