import {restCall,mcpOptions} from '@/lib/mcp/transport'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
export async function POST(request:Request,{params}:{params:Promise<{tool:string}>}){return restCall(request,(await params).tool)}
export const OPTIONS=mcpOptions