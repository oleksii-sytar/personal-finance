// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest'
import {rpc,McpFailure,failureResponse} from '@/lib/mcp/security'
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
async function fail(status:number,body:unknown){
 vi.spyOn(console,'warn').mockImplementation(()=>{})
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(body,{status})))
 try{await rpc('private-token','finance_mcp_commit',{p_request:'private-request'});throw Error('Expected failure')}catch(e){expect(e).toBeInstanceOf(McpFailure);return e as McpFailure}
}
describe('database action failures are not OAuth outages',()=>{
 it('keeps the historical-installment P0002 as a database failure, not retryable OAuth',async()=>{
  const e=await fail(500,{code:'P0002',message:'query returned no rows',details:'PRIVATE SQL DATA'})
  expect(e.status).toBe(500);expect(e.message).toContain('P0002')
  expect(e.message).not.toContain('Сервіс авторизації')
  const response=failureResponse(e);expect(response.headers.has('www-authenticate')).toBe(false)
  expect(response.headers.has('retry-after')).toBe(false)
  expect(JSON.stringify(await response.json())).not.toContain('PRIVATE')
 })
 it('keeps a business-rule explanation and its 422 status',async()=>{
  const e=await fail(422,{code:'PT422',message:'Оберіть наявну фактичну операцію'})
  expect(e).toMatchObject({status:422,message:'Оберіть наявну фактичну операцію'})
 })
 it('preserves a 409 conflict instead of disguising it as a generic 400',async()=>{
  expect(await fail(409,{code:'PT409',message:'Already linked elsewhere'})).toMatchObject({status:409,message:'Already linked elsewhere'})
 })
 it.each([502,503,504])('labels an unavailable database %i as data-service failure',async status=>{
  const e=await fail(status,{message:'Unavailable'})
  expect(e.status).toBe(503);expect(e.message).toContain('Сервіс даних')
  expect(e.message).toContain('request_id')
  expect(failureResponse(e).headers.get('retry-after')).toBe('5')
 })
 it('recognizes a database connection error code even behind HTTP 500',async()=>{
  const e=await fail(500,{code:'08006',message:'connection failure'})
  expect(e.status).toBe(503);expect(e.message).not.toContain('Сервіс авторизації')
 })
 it('never logs a token, financial payload, or raw database details',async()=>{
  await fail(500,{code:'P0002',message:'PRIVATE NAME',details:'PRIVATE SQL DATA'})
  expect(console.warn).toHaveBeenCalledWith('[mcp] database rpc failed',{rpc:'finance_mcp_commit',status:500,code:'P0002'})
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/PRIVATE|private-token|private-request/)
 })
 it('does not retry uncertain writes automatically',async()=>{
  const fetchMock=vi.fn().mockRejectedValue(new TypeError('fetch failed'))
  vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',fetchMock)
  await expect(rpc('private-token','finance_mcp_commit')).rejects.toMatchObject({status:503})
  expect(fetchMock).toHaveBeenCalledTimes(1)
 })
 it('continues to enforce expired tokens and read-only grants',async()=>{
  expect((await fail(401,{message:'JWT expired'})).status).toBe(401)
  expect((await fail(403,{code:'42501',message:'Read only'})).status).toBe(403)
 })
})