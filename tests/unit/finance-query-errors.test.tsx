import {describe,it,expect,vi} from 'vitest'
import {render,screen,waitFor,act} from '@testing-library/react'
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query'
import {FinanceQueryErrors} from '@/components/layout/finance-query-errors'
function Reader({id='accounts',fail=true}:{id?:string;fail?:boolean}){useQuery({queryKey:[id],queryFn:async()=>{if(fail)throw new Error('Offline');return []},retry:false});return null}
const client=()=>new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})
describe('Financial query feedback',()=>{
 it('shows active failures and removes the alert after recovery',async()=>{
  const qc=client();render(<QueryClientProvider client={qc}><FinanceQueryErrors/><Reader/></QueryClientProvider>);
  expect(await screen.findByRole('alert')).toBeVisible();act(()=>qc.setQueryData(['accounts'],[]));await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());qc.clear()
 })
 it('does not carry an inactive failed query into another page',async()=>{
  const qc=client();await qc.fetchQuery({queryKey:['old-page'],queryFn:async()=>{throw new Error('Old failure')}}).catch(()=>{});
  render(<QueryClientProvider client={qc}><FinanceQueryErrors/><Reader id="new-page" fail={false}/></QueryClientProvider>);
  await waitFor(()=>expect(qc.getQueryState(['new-page'])?.status).toBe('success'));expect(screen.queryByRole('alert')).toBeNull();qc.clear()
 })
 it('batches observer notifications and leaves FX feedback to its own banner',async()=>{
  const qc=client(),errors=vi.spyOn(console,'error').mockImplementation(()=>{});
  try{const tree=(extra=false)=><QueryClientProvider client={qc}><FinanceQueryErrors/><Reader id="exchange-rates"/>{extra&&<Reader id="another" fail={false}/>}</QueryClientProvider>;
   const view=render(tree());await waitFor(()=>expect(qc.getQueryState(['exchange-rates'])?.status).toBe('error'));view.rerender(tree(true));await waitFor(()=>expect(qc.getQueryState(['another'])?.status).toBe('success'));
   expect(screen.queryByRole('alert')).toBeNull();expect(errors.mock.calls.flat().join(' ')).not.toMatch(/Cannot update a component/)
  }finally{errors.mockRestore();qc.clear()}
 })
})