import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
const {rpcMock}=vi.hoisted(()=>({rpcMock:vi.fn()}))
vi.mock('@/lib/mcp/security',async()=>({...await vi.importActual<typeof import('@/lib/mcp/security')>('@/lib/mcp/security'),rpc:rpcMock}))
vi.mock('@/app/api/exchange-rates/route',()=>({GET:async()=>Response.json({rates:{UAH:1},date:'2026-09-14'})}))
import {callTool} from '@/lib/mcp/service'
const id='12345678-1234-1234-1234-123456789abc'
const ctx={token:'test-only',connection_id:id,workspace_id:id,user_id:id,role:'owner',can_write:true,expires_at:'2099-01-01T00:00:00Z',name:'QA'}
let records:Record<string,any[]>
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-14T12:00:00Z'))
 records={
  accounts:[{id:'cash',name:'Cash',type:'cash',currency:'UAH',current_balance:50000,created_at:'2026-01-01T00:00:00Z'},{id:'card',name:'IRON',type:'credit_card',currency:'UAH',current_balance:-186835.25,credit_limit:160000,created_at:'2026-01-01T00:00:00Z'},{id:'loan',name:'Mono',type:'bank_loan',currency:'UAH',current_balance:-14853.32,created_at:'2026-01-01T00:00:00Z'}],
  settings:[{display_currency:'UAH',safety_buffer_days:30}],
  transactions:[{id:'history',account_id:'cash',kind:'expense',status:'completed',amount:1000,currency:'UAH',description:'Purchase',transaction_date:'2026-09-13'}],
  loans:[{account_id:'loan',workspace_id:id,payment_account_id:'card',tracking_start_date:'2026-09-11',updated_at:'2026-09-14T12:00:00Z'}],
  schedule:[{id:'row1',account_id:'loan',workspace_id:id,payment_date:'2026-09-27',payment_total:7426.67,principal:7426.67,status:'scheduled',sequence:1},{id:'row2',account_id:'loan',workspace_id:id,payment_date:'2026-10-27',payment_total:7426.65,principal:7426.65,status:'scheduled',sequence:2}]
 }
 rpcMock.mockReset();rpcMock.mockImplementation(async(_token,name,args)=>{
  if(name==='finance_model_read')return {coverage:[],positions:[],forecasts:[]};if(name!=='finance_mcp_read')throw Error('Forecast must never write')
  const items=records[args.p_resource]||[]
  return {items,total:items.length,nextOffset:null}
 })
})
afterEach(()=>vi.useRealTimers())
describe('MCP forecast matches the UI model',()=>{
 it('does not fetch schedules or generate installments from them',async()=>{
  const result=await callTool(ctx,'get_forecast',{through:'2026-10-31',currency:'UAH'})
  expect(result.creditCards.payments).toEqual([])
  expect(rpcMock.mock.calls.some(call=>['loans','schedule'].includes(call[2]?.p_resource))).toBe(false)
  expect(result.planned_flows).toEqual({income:0,incomeCount:0,expense:0,expenseCount:0})
  expect(result.points.at(-1).balance).toBe(3000)
 })
 it('counts only explicitly created plans alongside income',async()=>{
  records.transactions.push({id:'explicit',account_id:'card',loan_account_id:'loan',kind:'expense',status:'planned',amount:7426.67,currency:'UAH',description:'Created plan',transaction_date:'2026-09-27'},{id:'salary',account_id:'cash',kind:'income',status:'planned',amount:120000,currency:'UAH',description:'Salary',transaction_date:'2026-09-15'})
  const result=await callTool(ctx,'get_forecast',{through:'2026-09-30'})
  expect(result.planned_flows).toEqual({income:120000,incomeCount:1,expense:7426.67,expenseCount:1})
  expect(result.points.at(-1).balance).toBe(154000)
 })
 it('applies preliminary spending without claiming confirmed coverage',async()=>{
  const result=await callTool(ctx,'get_forecast',{through:'2026-10-31'})
  expect(result).toMatchObject({trend_reliable:false,safety_reserve:29000,safety_buffer_days:30})
  expect(result.trend.confidence).toBe('preliminary');expect(result.points.slice(1).every((p:any)=>p.expense===1000)).toBe(true)
 })
})