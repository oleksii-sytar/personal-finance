// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest'
import {generateKeyPairSync,randomUUID,sign} from 'node:crypto'
import {GET,OPTIONS} from '@/app/.well-known/oauth-protected-resource/route'
import {GET as resourceGET,OPTIONS as resourceOPTIONS} from '@/app/.well-known/oauth-protected-resource/api/mcp/route'
import {authenticate,failureResponse,McpFailure,MCP_ISSUER,MCP_METADATA,MCP_RESOURCE,rpc} from '@/lib/mcp/security'
vi.mock('@/lib/mcp/service',()=>({callTool:vi.fn()}))
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
function credentials(overrides:Record<string,unknown>={}){
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'P-256'})
 const kid=randomUUID(),now=Math.floor(Date.now()/1000)
 const header=Buffer.from(JSON.stringify({alg:'ES256',kid,typ:'JWT'})).toString('base64url')
 const payload=Buffer.from(JSON.stringify({iss:MCP_ISSUER,aud:MCP_RESOURCE,role:'authenticated',sub:randomUUID(),client_id:randomUUID(),session_id:randomUUID(),iat:now,exp:now+3600,...overrides})).toString('base64url')
 const message=header+'.'+payload
 const token=message+'.'+sign('sha256',Buffer.from(message),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')
 return {token,jwk:{...publicKey.export({format:'jwk'}),kid,alg:'ES256',use:'sig'}}
}
function request(token:string){return new Request(MCP_RESOURCE,{method:'POST',headers:{Authorization:'Bearer '+token}})}
async function errorResponse(run:()=>Promise<unknown>){try{await run();throw new Error('Expected rejection')}catch(e){expect(e).toBeInstanceOf(McpFailure);return failureResponse(e)}}
describe('OAuth discovery routes must be included in every deployment',()=>{
 it('publishes the root and resource-specific metadata without login',async()=>{
  for(const get of [GET,resourceGET]){const response=get();expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('application/json');expect(response.headers.get('access-control-allow-origin')).toBe('*');expect(await response.json()).toMatchObject({resource:MCP_RESOURCE,authorization_servers:[MCP_ISSUER],bearer_methods_supported:['header']})}
 })
 it('supports metadata preflight at both paths',()=>{
  for(const options of [OPTIONS,resourceOPTIONS]){const response=options();expect(response.status).toBe(204);expect(response.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS')}
 })
 it('points an unauthenticated challenge to the deployed metadata',async()=>{
  const response=await errorResponse(()=>authenticate(new Request(MCP_RESOURCE)))
  expect(response.status).toBe(401);expect(response.headers.get('www-authenticate')).toContain('resource_metadata="'+MCP_METADATA+'"')
 })
})
describe('OAuth availability is not confused with invalid authorization',()=>{
 it('returns retryable 503 for a JWKS network failure, without reauthentication',async()=>{
  const c=credentials();vi.spyOn(console,'warn').mockImplementation(()=>{})
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('fetch failed')))
  const response=await errorResponse(()=>authenticate(request(c.token)))
  expect(response.status).toBe(503);expect(response.headers.has('www-authenticate')).toBe(false);expect(response.headers.get('retry-after')).toBe('5')
 })
 it('returns retryable 503 for an unavailable JWKS server',async()=>{
  const c=credentials();vi.spyOn(console,'warn').mockImplementation(()=>{})
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('Unavailable',{status:503})))
  const response=await errorResponse(()=>authenticate(request(c.token)))
  expect(response.status).toBe(503);expect(response.headers.has('www-authenticate')).toBe(false)
 })
 it('continues to reject expired tokens without contacting upstream',async()=>{
  const c=credentials({exp:0}),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock)
  const response=await errorResponse(()=>authenticate(request(c.token)))
  expect(response.status).toBe(401);expect(fetchMock).not.toHaveBeenCalled()
 })
 it('continues to reject a bad signature',async()=>{
  const c=credentials(),other=credentials();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({keys:[{...other.jwk,kid:c.jwk.kid}]})))
  const response=await errorResponse(()=>authenticate(request(c.token)))
  expect(response.status).toBe(401)
 })
 it('authenticates a valid token and validates the database connection',async()=>{
  const c=credentials(),context={connection_id:randomUUID(),user_id:randomUUID(),workspace_id:randomUUID(),role:'manager',can_write:true}
  const fetchMock=vi.fn().mockResolvedValueOnce(Response.json({keys:[c.jwk]})).mockResolvedValueOnce(Response.json(context));vi.stubGlobal('fetch',fetchMock)
  expect(await authenticate(request(c.token))).toMatchObject(context);expect(fetchMock).toHaveBeenCalledTimes(2)
 })
 it('still requires reauthentication for a revoked connection',async()=>{
  const c=credentials();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({keys:[c.jwk]})).mockResolvedValueOnce(Response.json({code:'42501',message:'Connection revoked'},{status:403})))
  const response=await errorResponse(()=>authenticate(request(c.token)));expect(response.status).toBe(401)
 })
 it('treats a temporary database network failure as retryable',async()=>{
  vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('fetch failed')))
  const response=await errorResponse(()=>rpc('test-token','finance_mcp_context'));expect(response.status).toBe(503);expect(response.headers.has('www-authenticate')).toBe(false)
 })
 it('preserves an expired database token as a 401 challenge',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:'JWT expired'},{status:401})))
  const response=await errorResponse(()=>rpc('test-token','finance_mcp_context'));expect(response.status).toBe(401)
 })
})