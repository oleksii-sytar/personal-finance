import {parsePlanRate} from '@/lib/planning/model'
import {describe,it,expect} from 'vitest'
import fc from 'fast-check'
import {parseMoney,moneyCents,sumMoney,roundMoney} from '@/lib/money/decimal'
import {parseDelimited,parseAmount,normalizeDate,toParsedRows} from '@/lib/import/parse-statement'
import {validateStatement} from '@/lib/import/validate-statement'
import {parseLoanSchedule} from '@/lib/loans/model'
import {accountFormSchema,categorySchema,transactionSchema} from '@/lib/validations/finance'
import {labelKey} from '@/lib/integrity/text'
import {monthlyTotals,spendingByCategory} from '@/lib/calculations/reports'
import type {Transaction} from '@/types/domain'
const malformed=['1e3','1e-3','1e309','0x10','0b101','1+2','1-2','1*2','1/2','1:30','2^10','2**3','--100','++100','+-100','100-200','12abc34','NaN42','Infinity77','100USD200EUR','100(20)','1,23.45','12,34.56','1.23,45','10%','–100','100−20']
const mapping={date:0,description:1,amount:2},today='2026-11-09'
describe('strict monetary boundaries: QA regression',()=>{
 it.each(malformed)('does not turn %s into a different amount',raw=>expect(parseAmount(raw)).toBeNull())
 it('preserves the Unicode minus rather than converting an expense to income',()=>expect(parseAmount('−100')).toBe(-100))
 it.each(['1 234,56','1\u00a0234,56','1\u202f234,56','1,234.56','1.234,56'])('supports a well formed bank amount %s',raw=>expect(parseAmount(raw)).toBe(1234.56))
 it('verifies an explicit currency token against the selected account',()=>{expect(parseAmount('$100','UAH')).toBeNull();expect(parseAmount('$100','USD')).toBe(100)})
 it.each([0.001,1.001,1e-10,Infinity,NaN,1e12])('rejects invalid numeric values without rounding: %s',raw=>expect(parseMoney(raw)).toBeNull())
 it('allows floating-point representation noise, not fractional cents',()=>expect(parseMoney(0.1+0.2)).toBe(.3))
 it('rounds display values symmetrically without swallowing a below-half value',()=>{expect(roundMoney(1.005)).toBe(1.01);expect(roundMoney(-1.005)).toBe(-1.01);expect(roundMoney(1.00499999999)).toBe(1)})
 it('conserves integer cents over varied transaction orders',()=>fc.assert(fc.property(fc.array(fc.integer({min:-100000000,max:100000000}),{maxLength:1000}),cents=>{expect(moneyCents(sumMoney(cents.map(n=>n/100)))).toBe(cents.reduce((a,b)=>a+b,0))}),{numRuns:500}))
 it('round-trips supported money up to the limit',()=>fc.assert(fc.property(fc.integer({min:-99999999999999,max:99999999999999}),cents=>{expect(parseMoney((cents/100).toFixed(2))).toBe(cents/100)}),{numRuns:500}))
})
describe('CSV structure and traceability',()=>{
 it('preserves a quoted multiline record and escaped quotes',()=>{const p=parseDelimited('Date;Description;Amount\n2026-11-09;"First line\nsecond ""quoted"" line";-10');expect(p.errors).toEqual([]);expect(p.rows).toHaveLength(1);expect(p.rows[0][1]).toBe('First line\nsecond "quoted" line')})
 it('counts separators only outside quoted header fields',()=>expect(parseDelimited('Date;"Description, with, commas";Amount\n2026-11-09;x;1').delimiter).toBe(';'))
 it.each(['Date;Description;Amount\n2026-11-09;x;10;-1000','Date;Description;Amount;Amount\n2026-11-09;x;10;-1000','Date;Description;Amount\n2026-11-09;"unterminated;1'])('blocks malformed complete files',csv=>expect(parseDelimited(csv).errors.length).toBeGreaterThan(0))
 it('cannot map Date to an amount',()=>expect(toParsedRows([['2026-11-09','x','10']],{date:0,description:1,amount:0})[0].valid).toBe(false))
 it('blocks duplicate bank IDs in the same file even when amounts differ',()=>{const p=validateStatement('Date;Description;Amount;bank_id\n2026-11-09;a;-10;REF\n2026-11-09;b;-20;REF',mapping,'UAH',today);expect(p.rows.every(r=>!r.valid)).toBe(true)})
 it('retains long original descriptions, without silently truncating the parsed source',()=>{const description='x'.repeat(132);expect(validateStatement('Date;Description;Amount\n2026-11-09;'+description+';1',mapping,'UAH',today).rows[0].description).toBe(description)})
 it.each(['2026-11-09 99:99:99','2026-11-09 / 2025-01-01','2026-11-09T12:60:00','2026-11-09T12:00:00+14:30'])('rejects ambiguous dates or impossible times: %s',raw=>expect(normalizeDate(raw)).toBeNull())
 it('retains the bank timestamp and timezone for provenance',()=>{expect(toParsedRows([['2026-11-09T23:30:00+03:00','x','10']],mapping)[0].occurredAt).toBe('2026-11-09T23:30:00+03:00')})
 it('rejects future actual records',()=>expect(validateStatement('Date;Description;Amount\n2026-11-10;x;10',mapping,'UAH',today).rows[0].valid).toBe(false))
})
describe('loan schedule accuracy',()=>{
 it.each(malformed)('rejects malformed principal: %s',raw=>expect(parseLoanSchedule('payment_date;principal;payment_total\n2027-01-01;'+raw+';1000000','UAH').errors.length).toBeGreaterThan(0))
 it.each(malformed)('rejects malformed payment: %s',raw=>expect(parseLoanSchedule('payment_date;principal;payment_total\n2027-01-01;0;'+raw,'UAH').errors.length).toBeGreaterThan(0))
 it.each(['interest','fees','insurance','other','principal_balance_after'])('rejects negative Unicode %s',field=>expect(parseLoanSchedule('payment_date;principal;payment_total;'+field+'\n2027-01-01;10;100;−20','UAH').errors.length).toBeGreaterThan(0))
 it.each(['interest','fees','insurance','other'])('rejects scientific %s',field=>expect(parseLoanSchedule('payment_date;principal;payment_total;'+field+'\n2027-01-01;10;100;1e3','UAH').errors.length).toBeGreaterThan(0))
 it('requires exact equality when all components are specified',()=>expect(parseLoanSchedule('payment_date;principal;interest;fees;insurance;other;payment_total\n2027-01-01;10;0;0;0;0;100','UAH').errors.length).toBeGreaterThan(0))
 it('keeps unknown components null and does not invent costs',()=>{const p=parseLoanSchedule('payment_date;principal;payment_total\n2027-01-01;10;100','UAH');expect(p.errors).toEqual([]);expect(p.rows[0].fees).toBeNull()})
 it('uses exact cents when comparing complete components',()=>expect(parseLoanSchedule('payment_date;principal;interest;fees;insurance;other;payment_total\n2027-01-01;0.1;0.2;0;0;0;0.3','UAH').errors).toEqual([]))
})
describe('visible identities and exact financial reports',()=>{
 it('rejects invisible account and category labels',()=>{expect(accountFormSchema.safeParse({name:'\u200b',type:'cash',currency:'UAH',openingBalance:0}).success).toBe(false);expect(categorySchema.safeParse({name:'\u200b',type:'expense',color:'#000000',icon:'tag'}).success).toBe(false)})
 it('normalizes identity without silently changing amounts',()=>expect(labelKey('  ＴＥＳＴ\u200b   Bank ')).toBe('test bank'))
 it('does not allow negative cash at the form boundary',()=>expect(accountFormSchema.safeParse({name:'cash',type:'cash',currency:'UAH',openingBalance:'-1'}).success).toBe(false))
 it('rejects invisible transaction descriptions',()=>expect(transactionSchema.safeParse({accountId:'a',kind:'expense',amount:1,currency:'UAH',description:'\u200b',transactionDate:today}).success).toBe(false))
 it('report and category totals reconcile exactly in cents',()=>{
  const rows=[.1,.2,.3].map((amount,i)=>({id:String(i),kind:'expense',amount,currency:'UAH',description:'x',transactionDate:today,status:'completed',categoryId:null}) as Transaction)
  const totals=monthlyTotals(rows,2026,10,'UAH',{reference:new Date('2026-11-09T12:00:00Z')});expect(totals).toEqual({income:0,expense:.6,net:-.6});expect(spendingByCategory(rows,[],2026,10,'UAH',{reference:new Date('2026-11-09T12:00:00Z')})[0].total).toBe(.6)
 })
})

describe('manual exchange rate input',()=>{
 it.each(['1 2','4e1','0','-1','1+2','1.234567891'])('rejects malformed rate %s',value=>expect(parsePlanRate(value)).toBeNull())
 it('keeps eight-decimal rates',()=>expect(parsePlanRate(' 41,12345678 ')).toBe(41.12345678))
})
