'use client'
import Link from 'next/link'
import {Banknote,CreditCard,ChevronRight,CheckCircle2} from 'lucide-react'
import {PeriodSummary} from '@/components/reports/period-summary'
import {useFinancialModel,useHistoricalRates} from '@/hooks/use-financial-model'
import {reportQuality} from '@/lib/money/statistical'
import {periodCoverage} from '@/lib/calculations/history'
import {monthlyTotals} from '@/lib/calculations/reports'
import {localDay} from '@/lib/calculations/liquidity'
import {LiquidityCard} from '@/components/dashboard/liquidity-card'
import {GettingStarted} from '@/components/onboarding/getting-started'
import {NetWorthCard} from '@/components/dashboard/net-worth-card'
import {ImportReminderSuggestion} from '@/components/settings/import-reminders'
import {Money} from '@/components/ui/finance-visuals'
import {useAccounts,useTransactions} from '@/hooks/use-finance'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {SpendingPowerCard} from '@/components/dashboard/spending-power-card'
import {isSpendingAccount} from '@/lib/money/balances'
import {needsReview} from '@/lib/reconciliation/model'
export default function DashboardPage(){
 const {data:accounts=[],isLoading}=useAccounts(),{data:transactions=[],isLoading:loadingTransactions,error:transactionsError}=useTransactions(),{displayCurrency,currentUser}=useWorkspaceContext(),liquid=accounts.filter(a=>isSpendingAccount(a)&&(a.type!=='credit_card'||a.currentBalance>0)),review=transactions.filter(needsReview).length
 const model=useFinancialModel()
 const period=localDay().slice(0,7),fx=useHistoricalRates(transactions.filter(t=>t.transactionDate.startsWith(period)),displayCurrency)
 const now=new Date(),month=localDay(now).slice(0,7),totals=monthlyTotals(transactions,Number(month.slice(0,4)),Number(month.slice(5))-1,displayCurrency,{rates:fx.data||[]}),hasMonth=periodCoverage(accounts,model.data?.coverage||[],month+'-01',localDay(now)).complete||transactions.some(t=>!t.deletedAt&&t.status==='completed'&&t.transactionDate.startsWith(month)&&t.transactionDate<=localDay(now))
 if(isLoading)return <div className="finance-skeleton" role="status">Завантажуємо ваші фінанси…</div>
 return <div className="finance-page"><header className="finance-page-heading"><div><p className="finance-eyebrow">Сімейні фінанси</p><h1>Огляд</h1></div><span className="finance-date">{new Date().toLocaleDateString('uk-UA',{day:'numeric',month:'long'})}</span></header><SpendingPowerCard accounts={accounts} displayCurrency={displayCurrency} currentUserId={currentUser?.id}/>{accounts.length===0?<GettingStarted/>:<><div className="account-rail" aria-label="Рахунки з власними коштами">{liquid.map(a=>{const Icon=a.type==='cash'?Banknote:CreditCard;return <Link key={a.id} className="account-peek" href={'/accounts/'+a.id}><span><Icon size={15}/><span className="truncate">{a.name}</span></span><Money value={a.currentBalance} currency={a.currency}/></Link>})}</div><Link className={'review-shortcut '+(review?'review-shortcut--pending':'')} href="/transactions?view=review"><span className="flex items-center gap-2"><CheckCircle2 size={18}/>{review?'Перевірити транзакції':'Транзакції перевірено'}</span><span className="flex items-center gap-2">{review>0&&<b>{review}</b>}<ChevronRight size={17}/></span></Link><div className="dashboard-summary-stack"><LiquidityCard/>{transactionsError?<p role="alert">Не вдалося завантажити результат місяця.</p>:loadingTransactions||fx.isLoading||model.isLoading?<div className="finance-skeleton" role="status">Рахуємо результат місяця…</div>:<PeriodSummary title="Результат місяця" totals={totals} currency={displayCurrency} hasData={hasMonth} quality={reportQuality(transactions,displayCurrency,month,{rates:fx.data||[]})} coverageComplete={periodCoverage(accounts,model.data?.coverage||[],month+'-01',localDay(now)).complete}><Link href="/reports" className="finance-card-link">Статистика<ChevronRight size={17}/></Link></PeriodSummary>}<section className="min-w-0 space-y-3" aria-labelledby="family-wealth-heading"><h2 id="family-wealth-heading" className="text-lg font-semibold text-primary">Майно та борги сім’ї</h2><NetWorthCard accounts={accounts} displayCurrency={displayCurrency}/></section></div><ImportReminderSuggestion/></>}</div>
}
