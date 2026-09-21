import {describe,it,expect} from 'vitest'
import {errorMessage} from '@/lib/errors'
describe('Actionable error messages',()=>{
 it('distinguishes service grants from an account balance',()=>{const m=errorMessage({code:'42501',message:'permission denied for table finance_transactions'});expect(m).toContain('налаштуваннями доступу');expect(m).toContain('не нестача грошей');expect(m).not.toContain('finance_transactions')})
 it('explains family permissions',()=>expect(errorMessage({code:'42501',message:'new row violates row-level security policy'})).toContain('прав у сім’ї'))
 it('avoids blind retry after a network failure',()=>expect(errorMessage(new TypeError('Failed to fetch'))).toContain('чи зміни вже збереглися'))
 it.each(['23505','23503','23514','429','401','40001'])('translates code %s',code=>expect(errorMessage({code,message:'internal'})).not.toContain('internal'))
 it('preserves domain validation',()=>expect(errorMessage(new Error('Для переказу потрібен інший рахунок одержувача'))).toBe('Для переказу потрібен інший рахунок одержувача'))
 it('hides internal stack and schema errors',()=>expect(errorMessage({message:'column secret_token does not exist'})).not.toContain('secret_token'))
 it('handles a thrown object and missing message',()=>{expect(errorMessage({code:'23505'})).toContain('уже існує');expect(errorMessage(undefined)).toContain('Не вдалося')})
})