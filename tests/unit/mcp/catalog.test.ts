import {describe,it,expect} from 'vitest'
import {tools,validate,toolMetadata} from '@/lib/mcp/catalog'
import {validClaims,stableHash,MCP_RESOURCE,MCP_ISSUER} from '@/lib/mcp/security'
const id='12345678-1234-1234-1234-123456789abc'
const schema=(name:string)=>tools.find(t=>t.name===name)!.inputSchema
const values={account_id:id,kind:'expense',amount:12.34,currency:'UAH',description:'Тест',transaction_date:'2026-09-11'}
describe('MCP capability contracts',()=>{
 it('has unique tools and explicit permission annotations',()=>{expect(new Set(tools.map(t=>t.name)).size).toBe(tools.length);expect(tools.length).toBeGreaterThan(50);for(const tool of tools){const m=toolMetadata(tool);expect(m.annotations.readOnlyHint).toBe(tool.readOnly);expect(m.annotations.openWorldHint).toBe(false);expect(m.securitySchemes[0].type).toBe('oauth2');if(!tool.readOnly)expect(tool.inputSchema.required).toContain('request_id')}})
 it('accepts a normal expense',()=>expect(()=>validate(schema('create_transaction'),{values,request_id:id})).not.toThrow())
 it('requires idempotency for writes',()=>expect(()=>validate(schema('create_transaction'),{values})).toThrow('request_id'))
 it('rejects hidden authorization fields',()=>expect(()=>validate(schema('create_transaction'),{values:{...values,workspace_id:id},request_id:id})).toThrow('unknown field'))
 it('rejects prototype fields',()=>expect(()=>validate(schema('list_transactions'),JSON.parse('{"__proto__":{}}'))).toThrow('Unsafe property'))
 it('rejects impossible dates',()=>expect(()=>validate(schema('create_transaction'),{values:{...values,transaction_date:'2026-02-30'},request_id:id})).toThrow('calendar date'))
 it('rejects fractional cents',()=>expect(()=>validate(schema('create_transaction'),{values:{...values,amount:12.345},request_id:id})).toThrow('decimal places'))
 it('requires positive transaction amounts',()=>expect(()=>validate(schema('create_transaction'),{values:{...values,amount:-1},request_id:id})).toThrow('outside limits'))
 it('allows a negative actual account balance',()=>expect(()=>validate(schema('explain_balance_difference'),{account_id:id,actual_balance:-41116.45})).not.toThrow())
 it('preserves exact optimistic timestamp versions',()=>expect(()=>validate(schema('review_transaction'),{id,expected_updated_at:'2026-09-11T12:15:16.123456+00:00',request_id:id})).not.toThrow())
 it('bounds pagination',()=>expect(()=>validate(schema('list_transactions'),{limit:201})).toThrow('limits'))
 it('requires valid UUIDs',()=>expect(()=>validate(schema('get_account'),{id:'other-family'})).toThrow('UUID'))
 it('supports explicit decisions for rounded manual matches',()=>expect(()=>validate(schema('preview_statement'),{account_id:id,rows:[{date:'2026-09-11',description:'Тест',amount:-99.23}],resolutions:[{row:1,choice:'match',transaction_id:id,expected_updated_at:'2026-09-11T12:00:00Z'}]})).not.toThrow())
 it('requires every selected bulk version map',()=>expect(()=>validate(schema('bulk_categorize'),{ids:[id],category_id:id,request_id:id})).toThrow('versions'))
})
describe('MCP OAuth token boundaries',()=>{
 const claims={iss:MCP_ISSUER,aud:MCP_RESOURCE,role:'authenticated',sub:id,client_id:id,session_id:id,iat:100,exp:200}
 it('accepts scoped unexpired OAuth claims',()=>expect(validClaims(claims,150)).toBe(true))
 it('rejects ordinary application tokens',()=>expect(validClaims({...claims,aud:'authenticated'},150)).toBe(false))
 it('rejects tokens issued for another resource',()=>expect(validClaims({...claims,aud:'https://example.com/api/mcp'},150)).toBe(false))
 it('rejects forged issuers and missing sessions',()=>{expect(validClaims({...claims,iss:'https://attacker.invalid'},150)).toBe(false);expect(validClaims({...claims,session_id:null},150)).toBe(false)})
 it('rejects expired or future tokens',()=>{expect(validClaims(claims,200)).toBe(false);expect(validClaims({...claims,iat:300},150)).toBe(false)})
 it('canonicalizes object order without changing list order',()=>{expect(stableHash({a:1,b:{x:2,y:3}})).toBe(stableHash({b:{y:3,x:2},a:1}));expect(stableHash([1,2])).not.toBe(stableHash([2,1]))})
})