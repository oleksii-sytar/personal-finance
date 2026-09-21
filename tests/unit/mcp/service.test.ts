import {beforeEach,describe,it,expect,vi} from 'vitest'
const {rpcMock}=vi.hoisted(()=>({rpcMock:vi.fn()}))
vi.mock('@/lib/mcp/security',async()=>({...await vi.importActual<typeof import('@/lib/mcp/security')>('@/lib/mcp/security'),rpc:rpcMock}))
import {callTool} from '@/lib/mcp/service'
const id='12345678-1234-1234-1234-123456789abc',other='22345678-1234-1234-1234-123456789abc',version='a'.repeat(64)
const ctx={token:'test-only',connection_id:id,workspace_id:id,user_id:id,role:'owner',can_write:true,expires_at:'2099-01-01T00:00:00Z',name:'QA'}
const account={id,name:'QA cash',currency:'UAH',balance_anchor_at:'2026-09-11T10:00:00Z',current_balance:1000}
const row={date:'2026-09-10',amount:-99,description:'Coffee'}
let checks:any[]|undefined,commit:any
beforeEach(()=>{checks=undefined;commit={status:'completed',result:{id}};rpcMock.mockReset();rpcMock.mockImplementation(async(_token,name,args)=>{
 if(name==='finance_mcp_read'){
  if(args.p_resource==='accounts')return {items:[account],total:1,nextOffset:null}
  if(args.p_resource==='requests')return {items:[],total:0,nextOffset:null}
  if(args.p_resource==='statement_duplicates')return {checks:checks||args.p_filter.rows.map(()=>({status:'clear',candidates:[],candidate_version:version}))}
 }
 if(name==='finance_mcp_stage')return {id,status:'ready'}
 if(name==='finance_mcp_commit')return commit
 throw Error('Unexpected mock RPC '+name)
})})
const staged=()=>rpcMock.mock.calls.find(c=>c[1]==='finance_mcp_stage')?.[2]?.p_payload

describe('direct MCP write pipeline',()=>{
 it.each([
  ['archive_account',{id,expected_version:version}],
  ['save_loan',{account_id:id,values:{tracking_start_date:'2026-09-11'}}],
  ['cancel_request',{id:other}],
  ['create_transaction',{values:{account_id:id,kind:'expense',amount:99,currency:'UAH',description:'Coffee',transaction_date:'2026-09-11'}}],
 ])('executes %s immediately with an active write grant',async(name,args)=>{
  const result=await callTool(ctx,name as string,{...(args as object),request_id:id})
  expect(result).toMatchObject({status:'completed',applied:true,requires_confirmation:false})
  expect(rpcMock.mock.calls.some(c=>c[1]==='finance_mcp_commit')).toBe(true)
  expect(result).not.toHaveProperty('approval_url')
 })
 it('preserves read-only denial',async()=>{await expect(callTool({...ctx,can_write:false},'archive_account',{id,expected_version:version,request_id:id})).rejects.toThrow('лише до читання');expect(staged()).toBeUndefined()})
 it('imports clean normalized rows without an approval page',async()=>{await callTool(ctx,'import_statement',{account_id:id,rows:[row],request_id:id});expect(staged().rows).toHaveLength(1);expect(staged().rows[0].balance_treatment).toBe('auto')})
 it('returns candidates without staging an ambiguous import',async()=>{checks=[{status:'needs_resolution',candidates:[{id:other}],candidate_version:version}];const result=await callTool(ctx,'import_statement',{account_id:id,rows:[row],request_id:id});expect(result).toMatchObject({status:'needs_resolution',applied:false,requires_confirmation:false});expect(staged()).toBeUndefined()})
 it('passes the snapshot and evidence to the atomic guard',async()=>{await callTool(ctx,'import_statement',{account_id:id,rows:[row],resolutions:[{row:1,choice:'new',candidate_version:version,reason:'The source contains a separate second purchase.'}],request_id:id});expect(staged().rows[0].duplicate_resolution).toMatchObject({choice:'separate',candidate_version:version})})
 it('skips exact imports and does not request an empty native import',async()=>{checks=[{status:'duplicate_skipped',candidates:[{id:other}],candidate_version:version}];commit={status:'completed',result:{imported:0,skipped:1,applied:false}};const result=await callTool(ctx,'import_statement',{account_id:id,rows:[row],request_id:id});expect(staged().rows).toHaveLength(0);expect(staged().skipped_count).toBe(1);expect(result.applied).toBe(false)})
 it('does not create multiple occurrences of a stable bank ID',async()=>{await callTool(ctx,'import_statement',{account_id:id,rows:[{...row,bank_reference:'bank1'},{...row,bank_reference:'bank1'}],request_id:id});expect(staged().rows).toHaveLength(1);expect(staged().rows[0].import_key).toBe('bank:bank1');expect(staged().skipped_count).toBe(1)})
 it('preserves real identical rows without a stable bank ID',async()=>{await callTool(ctx,'import_statement',{account_id:id,rows:[row,row],request_id:id});expect(staged().rows).toHaveLength(2);expect(staged().rows[1].import_key).toContain('|occurrence:2')})
 it('rejects conflicting amounts under one bank ID',async()=>{await expect(callTool(ctx,'import_statement',{account_id:id,rows:[{...row,bank_reference:'bank1'},{...row,amount:-101,bank_reference:'bank1'}],request_id:id})).rejects.toThrow('банківський ID');expect(staged()).toBeUndefined()})
 it('never automatically executes an old pending request',async()=>{rpcMock.mockImplementation(async()=>({items:[{id,connection_id:id,operation:'archive_account',input_hash:'different',status:'pending'}]}));await expect(callTool(ctx,'archive_account',{id,expected_version:version,request_id:id})).rejects.toThrow('request_id');expect(rpcMock.mock.calls.some(c=>c[1]==='finance_mcp_commit')).toBe(false)})
})

describe('history coverage permission boundary',()=>{
 it('denies read-only confirmation without an RPC write',async()=>{await expect(callTool({...ctx,can_write:false},'confirm_history',{account_ids:[id],from:'2026-09-01',to:'2026-09-14',kind:'complete',request_id:id})).rejects.toThrow('лише до читання');expect(rpcMock).not.toHaveBeenCalled()})
 it('passes account scope and idempotency to the manager-only database boundary',async()=>{rpcMock.mockResolvedValue({applied:true,confirmed:1});expect(await callTool(ctx,'confirm_history',{account_ids:[id],from:'2026-09-01',to:'2026-09-14',kind:'complete',request_id:other})).toMatchObject({status:'completed',applied:true});expect(rpcMock).toHaveBeenCalledWith(ctx.token,'finance_confirm_history',{p_accounts:[id],p_from:'2026-09-01',p_to:'2026-09-14',p_kind:'complete',p_request:other})})
})