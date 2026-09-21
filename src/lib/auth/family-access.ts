import {createClient} from '@/lib/supabase/client'
export async function familyAccess(input:{action:'inspect'|'register';token:string;email?:string;fullName?:string;password?:string}):Promise<{ok?:boolean;email:string;familyName:string}>{
 const {data,error}=await createClient().functions.invoke('family-access',{body:input})
 if(error){
  let message='Не вдалося з’єднатися із сервісом доступу.'
  try{const body=await error.context?.json();if(body?.error)message=body.error}catch{}
  throw new Error(message)
 }
 if(data?.error)throw new Error(data.error)
 return data
}