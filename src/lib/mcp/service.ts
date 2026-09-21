
import {createHash} from 'node:crypto'
import {tools,validate,type Tool} from './catalog'
import {actionResponse as actionResult} from './action-results'
import {rpc,stableHash,McpFailure,MCP_ORIGIN,type McpContext} from './security'
import {parseDelimited,guessColumns,toParsedRows} from '@/lib/import/parse-statement'
import {reconciliationHints,transferCandidates} from '@/lib/import/matching'
import {parseLoanSchedule} from '@/lib/loans/model'
import {cashMovement} from '@/lib/calculations/cash-movement'
import {monthlyTotals,spendingByCategory,yearlyCashflow} from '@/lib/calculations/reports'
import {localDay} from '@/lib/calculations/liquidity'
import {buildForecast} from '@/lib/calculations/forecast'
import {needsReview,pendingForAccount,parseSignedBalance} from '@/lib/reconciliation/model'
import {netWorthSummary} from '@/lib/money/balances'
import {plannedAmount} from '@/lib/planning/model'
import {loadHistoricalRates} from '@/lib/money/historical-rates'
import {reportQuality} from '@/lib/money/statistical'
import {decodeFinancialModel} from '@/lib/data/financial-model'
import {ownerResources,savingsTotal} from '@/lib/calculations/household'
import {UAH_RATES,FX_STATUS,setExchangeRates} from '@/lib/money/fx'
import {GET as fetchExchangeRates} from '@/app/api/exchange-rates/route'
import type {Account,Transaction,Category,CurrencyCode} from '@/types/domain'
type Row=Record<string,any>
const camel=<T,>(r:Row):T=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),v])) as T
async function read(ctx:McpContext,resource:string,filter:Row={}){
 const result=await rpc(ctx.token,'finance_mcp_read',{p_resource:resource,p_filter:filter}) as {items:Row[];total:number;nextOffset:number|null;asOf:string}
 if(resource==='transactions'&&result.items?.some(t=>t.status==='planned'&&t.plan_exchange_mode)){
  const exchange=await rates()
  return {...result,items:result.items.map(t=>t.status==='planned'&&t.plan_exchange_mode?{...t,estimated_account_amount:plannedAmount(camel<Transaction>(t)),estimate_source:t.plan_exchange_mode==='manual'?'manual':exchange.source,estimate_date:exchange.date,estimate_provisional:exchange.provisional}:t)}
 }
 return result
}
async function all(ctx:McpContext,resource:string,filter:Row={},cap=50000){const rows:Row[]=[];let offset=0;do{const result=await read(ctx,resource,{...filter,limit:200,offset});rows.push(...result.items);if(result.nextOffset===null)return rows;if(result.nextOffset>=cap)throw new McpFailure(422,'Забагато даних для одного розрахунку. Звузьте період або рахунок.');offset=result.nextOffset}while(true)}
async function account(ctx:McpContext,id:string){const a=(await read(ctx,'accounts',{id})).items[0];if(!a)throw new McpFailure(404,'Рахунок недоступний');return a}
function kyivReference(){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return new Date(day+'T12:00:00')}
let fxJob:Promise<{source:string;date:string|null;rates:typeof UAH_RATES;provisional:boolean}>|null=null
async function rates(){
 if(!fxJob)fxJob=(async()=>{const response=await fetchExchangeRates();if(response.ok){const data=await response.json();setExchangeRates(data.rates,data.date);return {source:'НБУ',date:data.date,rates:{...UAH_RATES},provisional:false}}return {source:'Резервні курси Forma',date:null,rates:{...UAH_RATES},provisional:true}})().finally(()=>{fxJob=null})
 return fxJob
}
async function statement(ctx:McpContext,args:Row){
 const a=await account(ctx,args.account_id)
 if(Boolean(args.csv)===Boolean(args.rows))throw new McpFailure(422,'Передайте рівно одне: csv або rows.')
 let rows:Row[]=[],bankIds:string[]=[]
 if(args.csv){
  const parsed=parseDelimited(args.csv.replace(/^\uFEFF/,'')),mapping=args.mapping||guessColumns(parsed.headers)
  rows=toParsedRows(parsed.rows,mapping).map(r=>({...r,occurred_at:r.occurredAt}))
  const bankColumn=parsed.headers.findIndex(h=>/^(bank_id|transaction_id|reference_id)$/i.test(h.trim()))
  bankIds=parsed.rows.map(r=>bankColumn>=0?r[bankColumn]?.trim()||'':'')
 }else{rows=args.rows.map((r:Row)=>({...r,valid:!!r.date&&Number.isFinite(r.amount)&&r.amount!==0}));bankIds=rows.map(r=>r.bank_reference?.trim()||'')}
 if(!rows.length||rows.length>5000)throw new McpFailure(422,'Виписка: від 1 до 5000 рядків.')
 const invalid=rows.flatMap((r,i)=>!r.valid||Math.abs(r.amount)>=1e12||Math.abs(r.amount*100-Math.round(r.amount*100))>0.001?[i+1]:[])
 if(invalid.length)return {valid:false,invalid_rows:invalid,account:a,row_count:rows.length}
 const decisions=new Map<number,Row>()
 for(const decision of args.resolutions||[]){if(decision.row>rows.length||decisions.has(decision.row))throw new McpFailure(422,'Кожен номер рядка має мати не більше одного рішення.');decisions.set(decision.row,decision)}
 const seen=new Map<string,number>(),references=new Map<string,string>()
 const normalized=rows.map((r,i)=>{
  const fingerprint=JSON.stringify([r.date,r.amount<0?'expense':'income',Math.abs(r.amount).toFixed(2),r.description.trim().toLocaleLowerCase()])+(r.occurred_at?'|time:'+r.occurred_at:'')
  const bank=bankIds[i],base=bank?'bank:'+bank:fingerprint,occurrence=(seen.get(base)||0)+1;seen.set(base,occurrence)
  if(bank){const value=JSON.stringify([r.date,r.amount]);if(references.has(bank)&&references.get(bank)!==value)throw new McpFailure(422,'Один банківський ID має різні дати або суми. Перевірте рядок '+(i+1)+'.');references.set(bank,value)}
  const decision=decisions.get(i+1),skip=decision?.choice==='skip'||!!bank&&occurrence>1
  const key=base+(!bank&&occurrence>1?'|occurrence:'+occurrence:'')
  return {row:i+1,date:r.date,description:r.description,amount:r.amount,skip,decision,import_row:{account_id:a.id,kind:r.amount<0?'expense':'income',amount:Math.abs(r.amount),currency:a.currency,description:r.description,transaction_date:r.date,occurred_at:r.occurred_at||null,import_key:key,import_anchor_at:a.balance_anchor_at,balance_treatment:'auto',source_row:i+1,matched_transaction_id:decision?.choice==='match'?decision.transaction_id:null,match_updated_at:decision?.choice==='match'?decision.expected_updated_at:null,...(decision?.choice==='new'?{duplicate_resolution:{choice:'separate',candidate_version:decision.candidate_version,reason:decision.reason}}:{})}}
 })
 const response=await rpc(ctx.token,'finance_mcp_read',{p_resource:'statement_duplicates',p_filter:{account_id:a.id,rows:normalized.map(r=>r.import_row)}}) as {checks:Row[]}
 const preview=normalized.map((r,i)=>{const checked=response.checks[i];return {row:r.row,date:r.date,description:r.description,amount:r.amount,skip:r.skip||checked.status==='duplicate_skipped',resolved:r.skip||checked.status!=='needs_resolution',possible_duplicate:checked.candidates.length>0,...checked,import_row:r.import_row}})
 return {valid:true,account:{id:a.id,name:a.name,currency:a.currency,balance_anchor_at:a.balance_anchor_at,current_balance:a.current_balance},row_count:rows.length,from:rows.reduce((v,r)=>r.date<v?r.date:v,rows[0].date),to:rows.reduce((v,r)=>r.date>v?r.date:v,rows[0].date),unresolved:preview.filter(r=>!r.resolved).length,skipped_count:preview.filter(r=>r.skip).length,preview:preview.map(({import_row,...r})=>r),import_rows:preview.filter(r=>!r.skip).map(r=>r.import_row)}
}
export async function callTool(ctx:McpContext,name:string,input:unknown){
 const tool=tools.find(t=>t.name===name);if(!tool)throw new McpFailure(404,'Unknown tool')
 try{validate(tool.inputSchema,input)}catch(e){throw new McpFailure(422,(e as Error).message)}
 const args=input as Row
 if(tool.resource)return read(ctx,tool.resource,args)
 if(name==='get_model_history')return decodeFinancialModel(await rpc(ctx.token,'finance_model_read'))
 if(name==='confirm_history'){
  if(!ctx.can_write)throw new McpFailure(403,'Підключення має доступ лише до читання.')
  const result=await rpc(ctx.token,'finance_confirm_history',{p_accounts:args.account_ids,p_from:args.from,p_to:args.to,p_kind:args.kind,p_request:args.request_id})
  return {status:'completed',...result}
 }
 if(name==='get_context')return {user:{id:ctx.user_id,name:ctx.name},workspace_id:ctx.workspace_id,role:ctx.role,can_write:ctx.can_write,execution_policy:'direct-v2: no Forma approval links; duplicates return needs_resolution with candidates for the agent',expires_at:ctx.expires_at,time_zone:'Europe/Kyiv',today:localDay(kyivReference()),currency_convention:'Amounts are major units. Transaction amount is positive; kind determines sign. Account debt is negative. Period net is not the current balance.',unsupported:['Real bank payments','Native PDF/photo OCR: transcribe to CSV or rows first','Savings goal CRUD: not present in current product'],limits:{page:200,statement_rows:5000,loan_schedule_rows:1000,request_bytes:2097152}}
 if(name==='get_import'){
  const batch=(await read(ctx,'imports',{id:args.id})).items[0];if(!batch)throw new McpFailure(404,'Імпорт недоступний')
  const entries=await all(ctx,'transactions',{import_batch_id:args.id});const versions=Object.fromEntries(entries.map(t=>[t.id,t.updated_at]).sort(([a],[b])=>a.localeCompare(b)))
  // PostgreSQL jsonb text has spaces; ask the gateway for the canonical fingerprint.
  const fingerprint=await rpc(ctx.token,'finance_mcp_read',{p_resource:'import_version',p_filter:{id:args.id}})
  return {batch,count:entries.length,entries_version:fingerprint.version,versions,transaction_ids:entries.map(t=>t.id)}
 }
 if(name==='preview_statement'){const s=await statement(ctx,args);const {import_rows,...preview}=s;return {...preview,preview:s.preview?.slice(args.preview_offset||0,(args.preview_offset||0)+100),next_preview_offset:s.preview&&(args.preview_offset||0)+100<s.preview.length?(args.preview_offset||0)+100:null}}
 if(name==='preview_loan_schedule'){const a=await account(ctx,args.account_id);return {...parseLoanSchedule(args.csv,a.currency),account:{id:a.id,name:a.name,currency:a.currency}}}
 if(['get_month_report','get_year_report','get_forecast','get_reconciliation','explain_balance_difference','find_transfer_pairs'].includes(name))return calculate(ctx,name,args)
 if(!ctx.can_write)throw new McpFailure(403,'Підключення має доступ лише до читання. Змініть дозволи у Forma.')
 const inputHash=stableHash({name,args});const previous=(await read(ctx,'requests',{request_key:args.request_id})).items.find(q=>q.connection_id===ctx.connection_id)
 if(previous){if(previous.input_hash!==inputHash||previous.operation!==tool.operation)throw new McpFailure(409,'Цей request_id уже використано для інших даних.');if(previous.status==='ready')return actionResult(await rpc(ctx.token,'finance_mcp_commit',{p_request:previous.id}));return actionResult({id:previous.id,status:previous.status,result:previous.result,expires_at:previous.expires_at})}
 const {request_id,...payload}=args;payload.input_hash=inputHash
 if(name==='confirm_balance'&&parseSignedBalance(args.value)===null)throw new McpFailure(422,'Введіть підписаний фактичний залишок, наприклад -41116,45.')
 if(name==='import_statement'){
  const s=await statement(ctx,args);if(!s.valid)throw new McpFailure(422,'Некоректні рядки: '+s.invalid_rows?.join(', '));if(s.unresolved)return {status:'needs_resolution',applied:false,requires_confirmation:false,unresolved:s.unresolved,preview:s.preview?.slice(0,100),next_preview_offset:s.preview&&s.preview.length>100?100:null,message:'Нічого не імпортовано. Агент має опрацювати candidates через resolutions: skip, match або new з candidate_version та поясненням. Підтвердження у Forma не потрібне.'}
  for(const k of Object.keys(payload))delete payload[k];Object.assign(payload,{input_hash:inputHash,account_id:args.account_id,account_name:s.account.name,currency:s.account.currency,rows:s.import_rows,skipped_count:s.skipped_count,file_name:args.file_name||'Виписка через MCP',import_request_id:request_id})
 }
 if(name==='import_loan_schedule'){const a=await account(ctx,args.account_id),parsed=parseLoanSchedule(args.csv,a.currency);if(parsed.errors.length)throw new McpFailure(422,parsed.errors.join('; '));delete payload.csv;Object.assign(payload,{rows:parsed.rows,account_name:a.name,currency:a.currency,file_name:args.file_name||'Графік через MCP',import_request_id:request_id})}
 if(name==='save_recurring')payload.recurring_request_id=request_id
 const staged=await rpc(ctx.token,'finance_mcp_stage',{p_operation:tool.operation,p_payload:payload,p_request_id:request_id})
 return actionResult(staged.status==='ready'?await rpc(ctx.token,'finance_mcp_commit',{p_request:staged.id}):staged)
}
async function calculate(ctx:McpContext,name:string,args:Row){
 const ref=kyivReference(),accountRows=await all(ctx,'accounts'),accounts=accountRows.map(r=>camel<Account>(r)),settings=(await read(ctx,'settings')).items[0],currency=(args.currency||settings?.display_currency||'UAH') as CurrencyCode
 const filter:Row={};if(name==='get_month_report'){filter.from=args.month+'-01';const [y,m]=args.month.split('-').map(Number);filter.to=localDay(new Date(y,m,0,12))}if(name==='get_year_report'){filter.from=args.year+'-01-01';filter.to=args.year+'-12-31'}if(args.account_id)filter.account_id=args.account_id;if(args.from)filter.from=args.from;if(args.to)filter.to=args.to
 const rows=await all(ctx,'transactions',filter),transactions=rows.map(r=>camel<Transaction>(r))
 if(name==='get_reconciliation')return {review_count:transactions.filter(needsReview).length,review_ids:transactions.filter(needsReview).map(t=>t.id),accounts:accounts.filter(a=>!args.account_id||a.id===args.account_id).map(a=>({id:a.id,name:a.name,currency:a.currency,current_balance:a.currentBalance,ledger_version:a.ledgerVersion,balance_anchor_at:a.balanceAnchorAt,unconfirmed_count:transactions.filter(t=>pendingForAccount(t,a.id)).length,last_reconciled_at:a.lastReconciledAt})),note:'Category review and bank balance confirmation are separate.'}
 if(name==='explain_balance_difference'){const a=accounts.find(a=>a.id===args.account_id);if(!a)throw new McpFailure(404,'Рахунок недоступний');const gap=Math.round((args.actual_balance-a.currentBalance)*100)/100;return {current_balance:a.currentBalance,actual_balance:args.actual_balance,difference:gap,hints:reconciliationHints(a,transactions,gap),note:'Hints are not evidence. No changes were made.'}}
 if(name==='find_transfer_pairs'){if(transactions.length>5000)throw new McpFailure(422,'Звузьте період пошуку до 5000 операцій.');return {pairs:transferCandidates(transactions),note:'Suggestions only. Do not merge automatically.'}}
 const exchange=await rates(),wealth=netWorthSummary(accounts,currency),model=decodeFinancialModel(await rpc(ctx.token,'finance_model_read'))
 const actualDates=transactions.filter(t=>!t.deletedAt&&t.status==='completed'&&t.transactionDate<=localDay(ref)&&(name!=='get_forecast'||Date.parse(t.transactionDate)>=Date.parse(localDay(ref))-90*86400000)).map(t=>t.transactionDate).sort()
 let historicalRates:import('@/types/domain').ExchangeRate[]=[];let historicalError=false
 if(actualDates.length)try{historicalRates=await loadHistoricalRates(actualDates[0],actualDates.at(-1)!,[...new Set([...transactions.filter(t=>t.status==='completed').map(t=>t.currency),currency])])}catch{historicalError=true}
 const reportOptions={rates:historicalRates,reference:ref},categories=(await all(ctx,'categories')).map(r=>camel<Category>(r))
 const members=(await all(ctx,'members')).map(r=>camel<import('@/types/domain').WorkspaceMember>(r)),resources={owners:ownerResources(accounts,members,currency),savings:savingsTotal(accounts,currency)}

 if(name==='get_month_report'){
  const [year,month]=args.month.split('-').map(Number),totals=monthlyTotals(transactions,year,month-1,currency,reportOptions),quality=reportQuality(transactions,currency,args.month,reportOptions)
  return {report_basis:'income_and_consumption',month:args.month,currency,...totals,net:quality.incomplete?null:totals.net,known_net:totals.net,
   categories:spendingByCategory(transactions,categories,year,month-1,currency,reportOptions),cash_movement:cashMovement(accounts,transactions,currency,args.month,reportOptions),current_position:wealth,resources,quality,exchange:{...exchange,historical_error:historicalError},
   note:'Income minus consumption. Loan principal, card repayments, own transfers and opening balances are not expenses or income. Saved estimated interest and fees ARE included and disclosed in quality. Truly unallocated payments or missing FX make net null; known_net is only a subtotal, not a confirmed surplus. Component gaps remain included in service, not lost. Transaction-date FX; no ledger changes.'}
 }
 if(name==='get_year_report'){
  const rawMonths=yearlyCashflow(transactions,args.year,currency,reportOptions),quality=reportQuality(transactions,currency,String(args.year),reportOptions)
  const knownTotals=rawMonths.reduce((a,m)=>({income:a.income+m.income,expense:a.expense+m.expense,net:a.net+m.net}),{income:0,expense:0,net:0})
  const months=rawMonths.map(m=>{const q=reportQuality(transactions,currency,args.year+'-'+String(m.month0+1).padStart(2,'0'),reportOptions);return {...m,net:q.incomplete?null:m.net,known_net:m.net,quality:q}})
  return {report_basis:'income_and_consumption',year:args.year,currency,months,totals:{...knownTotals,net:quality.incomplete?null:knownTotals.net,known_net:knownTotals.net},cash_movement:cashMovement(accounts,transactions,currency,String(args.year),reportOptions),current_position:wealth,resources,quality,exchange:{...exchange,historical_error:historicalError}}
 }
 if(args.through<localDay(ref)||Date.parse(args.through)-Date.parse(localDay(ref))>366*86400000)throw new McpFailure(422,'Прогноз: від сьогодні до 366 днів.')
 const {forecast,trend,reliable,reserve,paymentRows,summary}=buildForecast(accounts,transactions,currency,args.through,ref,settings?.safety_buffer_days||7,{coverage:model.coverage,categories,rates:historicalRates})
 return {currency,through:args.through,...forecast,scheduled_payments:paymentRows,scheduled_payment_total:summary.expense,planned_flows:summary,trend,resources,trend_reliable:reliable,safety_reserve:reserve,safety_buffer_days:settings?.safety_buffer_days||7,exchange,note:'Forecast uses explicitly created planned transactions only; loan schedules never create transactions or affect this forecast. Ordinary daily spending is a separate estimate, matching Forma UI and independent of the requested horizon. Daily estimates use only the last 90 completed days and categories with include_in_daily_forecast enabled; uncategorized expenses remain included. Reserve categories (is_essential) are independent. Category exclusions never remove explicitly created planned transactions or actual report expenses. Explicit one-off and scheduled costs are not repeated daily. Large sparse expenses in trend.reviewRows remain INCLUDED until clarified, and prevent a reliable-history label. Forecast flow matching never changes ledger rows. scheduled_payments contains outflows; planned_flows includes income and outflow totals and counts. Cash balance points reflect the selected accounts; card payments change projected card debt separately. Scenario bounds are not probability guarantees. Automatic ordinary spending assumes own-money funding; only explicit card-funded plans borrow. No ledger writes or bank payments are made.'}
}