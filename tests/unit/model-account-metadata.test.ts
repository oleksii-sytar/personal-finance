import {describe,it,expect} from 'vitest'
import {InMemoryRepository} from '@/lib/data/mock/in-memory-repository'
describe('Account metadata persists across the repository boundary',()=>{
 it('preserves an explicitly selected owner and savings designation',async()=>{const repo=new InMemoryRepository(),user=await repo.getCurrentUser();const account=await repo.createAccount({name:'Personal savings',type:'bank_debit',currency:'UAH',openingBalance:1000,ownerUserId:user.id,isShared:false,isSavings:true});expect(account.ownerUserId).toBe(user.id);expect(account.isSavings).toBe(true);expect(account.isShared).toBe(false)})
 it('does not assign shared funds to their creator',async()=>{const repo=new InMemoryRepository();const account=await repo.createAccount({name:'Shared cash',type:'cash',currency:'UAH',openingBalance:1000,ownerUserId:null,isShared:true});expect(account.ownerUserId).toBeNull();expect(account.isShared).toBe(true)})
})