import {AiConsent} from '@/components/settings/ai-consent'
export const dynamic='force-dynamic'
export const metadata={title:'Підключення AI | Forma',robots:{index:false,follow:false}}
export default async function Page({searchParams}:{searchParams:Promise<{authorization_id?:string}>}){return <AiConsent authorizationId={(await searchParams).authorization_id||''}/>}