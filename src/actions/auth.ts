'use server'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {signInSchema} from '@/lib/validations/auth'
import type {ActionResult} from '@/types/actions'
export async function signUpAction(_formData:FormData):Promise<ActionResult<{message:string}>>{return {error:'Реєстрація доступна лише через приватне запрошення.'}}
export async function resetPasswordAction(_formData:FormData):Promise<ActionResult<{message:string}>>{return {error:'Відновлення через листи вимкнене. Зверніться до власника сім’ї.'}}
export async function verifyEmailAction(_token:string):Promise<ActionResult<{message:string}>>{return {error:'Підтвердження пошти не потрібне для приватного запрошення.'}}
export async function resendVerificationAction(_email:string):Promise<ActionResult<{message:string}>>{return {error:'Надсилання листів вимкнене.'}}
export async function signInAction(formData:FormData):Promise<ActionResult<{message:string}>>{
 const input=signInSchema.safeParse({email:formData.get('email'),password:formData.get('password'),rememberMe:formData.get('rememberMe')==='on'})
 if(!input.success)return {error:input.error.flatten()}
 try{const db=await createClient();const {error}=await db.auth.signInWithPassword({email:input.data.email,password:input.data.password});if(error)return {error:'Неправильний логін або пароль.'}}catch{return {error:'Сервіс входу тимчасово недоступний.'}}
 revalidatePath('/','layout');redirect('/dashboard')
}
export async function signOutAction():Promise<void>{const db=await createClient();await db.auth.signOut();revalidatePath('/','layout');redirect('/auth/login')}
