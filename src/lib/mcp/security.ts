
import {createPublicKey,verify,createHash} from 'node:crypto'
import {SUPABASE_URL,SUPABASE_PUBLIC_KEY} from '@/config/backend'
export const MCP_ORIGIN='https://personal-finance-sigma-two.vercel.app'
export const MCP_RESOURCE=MCP_ORIGIN+'/api/mcp'
export const MCP_ISSUER=SUPABASE_URL+'/auth/v1'
export const MCP_METADATA=MCP_ORIGIN+'/.well-known/oauth-protected-resource/api/mcp'
export class McpFailure extends Error {constructor(public status:number,message:string){super(message)}}
export type McpContext={token:string;connection_id:string;workspace_id:string;user_id:string;role:string;can_write:boolean;expires_at:string;name:string}
let keys:{at:number;keys:Record<string,unknown>[]}={at:0,keys:[]}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validClaims(p:Record<string,unknown>,now=Math.floor(Date.now()/1000)){
 return p.iss===MCP_ISSUER&&p.aud===MCP_RESOURCE&&p.role==='authenticated'&&typeof p.exp==='number'&&p.exp>now&&typeof p.iat==='number'&&p.iat<=now+30&&(p.nbf===undefined||(typeof p.nbf==='number'&&p.nbf<=now+30))&&['sub','client_id','session_id'].every(k=>typeof p[k]==='string'&&UUID.test(p[k] as string))
}
async function upstream(url:string,init:RequestInit,service:'database'|'jwks'){
 try{
  const response=await fetch(url,init)
  if(service==='jwks'&&response.status>=500){console.warn('[mcp] upstream unavailable',{service,status:response.status});throw new McpFailure(503,'Сервіс авторизації тимчасово недоступний. Повторіть запит, не відключаючи Forma.')}
  return response
 }catch(error){
  if(error instanceof McpFailure)throw error
  console.warn('[mcp] upstream request failed',{service})
  throw new McpFailure(503,'Тимчасовий збій підключення. Повторіть запит, не відключаючи Forma.')
 }
}
export async function rpc(token:string,name:string,args:Record<string,unknown>={}){
 const response=await upstream(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(20000)},'database')
 const result=await response.json().catch(()=>null)
 if(!response.ok){
  const code=typeof result?.code==='string'&&/^[A-Z0-9]{5,9}$/.test(result.code)?result.code:'unknown'
  if(response.status>=500){
   console.warn('[mcp] database rpc failed',{rpc:name,status:response.status,code})
   const temporary=[502,503,504].includes(response.status)||/^(08|53|PGRST00)/.test(code)
   if(temporary)throw new McpFailure(503,'Сервіс даних тимчасово недоступний. Повторіть той самий запит із тим самим request_id, не відключаючи Forma.')
   throw new McpFailure(500,'Помилка виконання дії в базі ('+code+'). Це не помилка входу. Перевірте стан запиту перед повтором.')
  }
  const status=response.status===401?401:code==='42501'||response.status===403?403:[404,409,422,429].includes(response.status)?response.status:400
  throw new McpFailure(status,result?.message||'Не вдалося виконати дію. Спробуйте знову з тим самим request_id.')
 }
 return result
}
export async function authenticate(request:Request):Promise<McpContext>{
 const authorization=request.headers.get('authorization')||''
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)||authorization.length>16000)throw new McpFailure(401,'Підключіть Forma через OAuth.')
 const token=authorization.slice(7),parts=token.split('.');if(parts.length!==3)throw new McpFailure(401,'Invalid access token')
 try{
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')),payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))
  if(!['ES256','RS256'].includes(header.alg)||typeof header.kid!=='string'||!validClaims(payload))throw new Error('Invalid claims')
  if(Date.now()-keys.at>600000||!keys.keys.some(k=>k.kid===header.kid)){
   const response=await upstream(MCP_ISSUER+'/.well-known/jwks.json',{cache:'no-store',signal:AbortSignal.timeout(5000)},'jwks');if(!response.ok)throw new McpFailure(503,'Сервіс ключів авторизації тимчасово недоступний.')
   const data=await response.json();if(!Array.isArray(data.keys))throw new Error('Invalid JWKS');keys={at:Date.now(),keys:data.keys}
  }
  const jwk=keys.keys.find(k=>k.kid===header.kid&&k.alg===header.alg&&k.use!=='enc');if(!jwk)throw new Error('Unknown signing key')
  const key=createPublicKey({key:jwk,format:'jwk'})
  const ok=verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url'))
  if(!ok)throw new Error('Invalid signature')
 }catch(error){if(error instanceof McpFailure)throw error;throw new McpFailure(401,'Сесія MCP недійсна або прострочена. Підключіть Forma повторно.')}
 try{return {token,...await rpc(token,'finance_mcp_context')}}catch(e){if(e instanceof McpFailure&&e.status===403)throw new McpFailure(401,e.message);throw e}
}
export function challenge(){return 'Bearer resource_metadata="'+MCP_METADATA+'", scope="email", error="invalid_token", error_description="Connect your Forma account with OAuth"'}
export function headers(request?:Request){
 const origin=request?.headers.get('origin'),h:Record<string,string>={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID','Access-Control-Expose-Headers':'WWW-Authenticate, MCP-Protocol-Version','Referrer-Policy':'no-referrer'}
 if(origin&&['https://chatgpt.com','https://claude.ai',MCP_ORIGIN,request?new URL(request.url).origin:''].includes(origin))h['Access-Control-Allow-Origin']=origin
 return h
}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&!headers(request)['Access-Control-Allow-Origin'])throw new McpFailure(403,'Origin is not allowed')}
export async function bodyJson(request:Request,limit=2097152){
 if(Number(request.headers.get('content-length')||0)>limit)throw new McpFailure(413,'Request too large')
 if(!request.headers.get('content-type')?.includes('application/json'))throw new McpFailure(415,'Content-Type must be application/json')
 const reader=request.body?.getReader();if(!reader)throw new McpFailure(400,'JSON body required')
 const chunks:Uint8Array[]=[];let length=0;while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>limit){await reader.cancel();throw new McpFailure(413,'Request too large')}chunks.push(r.value)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new McpFailure(400,'Invalid JSON')}
}
export function stableHash(value:unknown){const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}
export function failureResponse(error:unknown,request?:Request){const status=error instanceof McpFailure?error.status:500;return Response.json({error:status===500?'Внутрішня помилка. Повторіть запит із тим самим request_id.':(error as Error).message},{status,headers:{...headers(request),...(status===401?{'WWW-Authenticate':challenge()}:status===503?{'Retry-After':'5'}:{})}})}