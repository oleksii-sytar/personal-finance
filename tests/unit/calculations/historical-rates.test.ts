import {describe,it,expect,vi,afterEach} from 'vitest'
import {loadHistoricalRates} from '@/lib/money/historical-rates'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
describe('official historical FX boundary',()=>{
 it('uses rate per currency unit and preserves each effective date',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-15T12:00:00Z'))
  const fetcher=vi.fn().mockResolvedValue(Response.json([{cc:'USD',exchangedate:'01.09.2026',rate:4000,units:100},{cc:'USD',exchangedate:'02.09.2026',rate:4200,units:100,rate_per_unit:42}]))
  vi.stubGlobal('fetch',fetcher)
  expect(await loadHistoricalRates('2026-09-01','2026-09-02',['USD'])).toEqual([{currency:'USD',date:'2026-09-01',rate:40},{currency:'USD',date:'2026-09-02',rate:42}])
  expect(String(fetcher.mock.calls[0][0])).toContain('bank.gov.ua/NBU_Exchange/exchange_site?');expect(String(fetcher.mock.calls[0][0])).toContain('start=20260901')
 })
 it('does not request future official rates',async()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(loadHistoricalRates('2026-09-16','2026-09-20',['USD'])).rejects.toThrow('період');expect(fetcher).not.toHaveBeenCalled()})
 it('keeps missing dates missing and surfaces an unavailable API',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json([])));expect(await loadHistoricalRates('2026-09-01','2026-09-02',['USD'])).toEqual([]);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:503})));await expect(loadHistoricalRates('2026-09-01','2026-09-02',['USD'])).rejects.toThrow('недоступні')})
})