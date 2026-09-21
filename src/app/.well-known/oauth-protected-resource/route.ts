import {protectedMetadata} from '@/lib/mcp/transport'
export const dynamic='force-dynamic'
export function GET(){return Response.json(protectedMetadata(),{headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'}})}
export function OPTIONS(){return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'}})}