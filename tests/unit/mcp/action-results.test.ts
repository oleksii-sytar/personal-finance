import {describe,it,expect} from 'vitest'
import {actionLabel,actionResponse} from '@/lib/mcp/action-results'
import {tools,validate} from '@/lib/mcp/catalog'
const id='12345678-1234-1234-1234-123456789abc',version='a'.repeat(64)
const values={account_id:id,kind:'expense',amount:99,currency:'UAH',description:'Coffee',transaction_date:'2026-09-11'}
const schema=tools.find(t=>t.name==='create_transaction')!.inputSchema

describe('direct execution and truthful outcomes',()=>{
 it('reports a completed mutation',()=>expect(actionResponse({status:'completed',result:{id}})).toMatchObject({applied:true,requires_confirmation:false}))
 it('does not call an existing duplicate a new mutation',()=>expect(actionResponse({status:'completed',result:{status:'duplicate_skipped',applied:false}})).toMatchObject({applied:false,requires_confirmation:false}))
 it('shows skipped duplicates clearly',()=>expect(actionLabel({status:'completed',result:{status:'duplicate_skipped'}})).toBe('Дубль пропущено'))
 it('does not call an all-duplicate import a new mutation',()=>expect(actionResponse({status:'completed',result:{imported:0,skipped:3,applied:false}}).applied).toBe(false))
 it('does not require approval for ambiguous data',()=>expect(actionResponse({status:'needs_resolution',result:{candidates:[]}})).toMatchObject({applied:false,requires_confirmation:false}))
 it('does not resurrect a legacy request or return approval links',()=>{const r=actionResponse({status:'pending'});expect(r.applied).toBe(false);expect(r).not.toHaveProperty('approval_url');expect(r.message).toContain('старий')})
 it('never claims rejected actions are applied',()=>expect(actionResponse({status:'rejected'}).applied).toBe(false))
 it('labels legacy pending honestly',()=>expect(actionLabel({status:'pending'})).toBe('Старий запит: не виконано'))
 it('distinguishes an unresolved match',()=>expect(actionLabel({status:'needs_resolution'})).toBe('AI має розібрати збіг'))
 it('advertises no mandatory approval-page workflow',()=>{for(const t of tools)expect(t.description).not.toMatch(/requires (explicit )?confirmation in Forma|after explicit confirmation|after preview and confirmation/i)})
 it('accepts evidence-based reuse of an existing operation',()=>expect(()=>validate(schema,{values,request_id:id,duplicate_resolution:{choice:'existing',transaction_id:id,candidate_version:version,reason:'The bank reference and receipt identify the same purchase.'}})).not.toThrow())
 it('accepts a distinct repeated purchase without a human approval boolean',()=>expect(()=>validate(schema,{values,request_id:id,duplicate_resolution:{choice:'separate',candidate_version:version,reason:'The receipt shows a distinct second tram ticket.'}})).not.toThrow())
 it('rejects a bare duplicate bypass flag',()=>expect(()=>validate(schema,{values,request_id:id,force:true})).toThrow())
 it('requires a current candidate snapshot',()=>expect(()=>validate(schema,{values,request_id:id,duplicate_resolution:{choice:'separate',reason:'Second tram ticket on the source.'}})).toThrow('candidate_version'))
 it('rejects empty evidence',()=>expect(()=>validate(schema,{values,request_id:id,duplicate_resolution:{choice:'separate',candidate_version:version,reason:''}})).toThrow())
 it('supports source-provided bank IDs',()=>expect(()=>validate(schema,{values,request_id:id,bank_reference:'bank-0001'})).not.toThrow())
 it('has a read-only duplicate preview',()=>expect(tools.find(t=>t.name==='preview_transaction')?.readOnly).toBe(true))
 it('exposes cancellation without exposing consent bypass tools',()=>{expect(tools.some(t=>t.name==='cancel_request')).toBe(true);expect(tools.some(t=>/approve|grant|commit_request/.test(t.name))).toBe(false)})
})