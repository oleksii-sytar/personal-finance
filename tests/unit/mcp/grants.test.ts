import {describe,it,expect,vi} from 'vitest'
import {revokeNativeGrant} from '@/lib/mcp/grants'
describe('native OAuth revocation',()=>{
 it('passes the SDK options object, not a bare string',async()=>{const revokeGrant=vi.fn().mockResolvedValue({error:null});expect(await revokeNativeGrant({oauth:{revokeGrant}},'qa-client')).toBe(true);expect(revokeGrant).toHaveBeenCalledWith({clientId:'qa-client'})})
 it('reports provider errors instead of claiming full revocation',async()=>{const revokeGrant=vi.fn().mockResolvedValue({error:{message:'Provider unavailable'}});expect(await revokeNativeGrant({oauth:{revokeGrant}},'qa-client')).toBe(false)})
 it('reports network failures without reopening financial access',async()=>{const revokeGrant=vi.fn().mockRejectedValue(new Error('Network'));expect(await revokeNativeGrant({oauth:{revokeGrant}},'qa-client')).toBe(false)})
})