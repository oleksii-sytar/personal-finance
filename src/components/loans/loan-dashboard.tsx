'use client'
import Link from 'next/link'
import {CreditCard,Landmark,ChevronRight,Plus} from 'lucide-react'
import {Button} from '@/components/ui/Button'
import {Card} from '@/components/ui/Card'
import {useAccounts,useMembers,useTransactions} from '@/hooks/use-finance'
import {useLoanData} from '@/hooks/use-loans'
import {useWorkspaceContext} from '@/contexts/workspace-context'
import {netWorthSummary,creditCardSummary} from '@/lib/money/balances'
import {accountOwner} from '@/lib/money/entry'
import {formatMoney} from '@/lib/money/format'
import {type LoanProfile,type LoanInstallment} from '@/lib/loans/model'
import {localDay} from '@/lib/calculations/liquidity'
import type {Account,CurrencyCode,Transaction,WorkspaceMember} from '@/types/domain'

const labels:Partial<Record<Account['type'],string>>={bank_loan:'Банківський кредит',mortgage:'Іпотека',microloan:'Мікрокредит',personal_debt:'Особистий борг',credit_card:'Кредитна картка'}
interface OverviewProps{accounts:Account[];members:WorkspaceMember[];profiles:LoanProfile[];rows:LoanInstallment[];transactions:Transaction[];currency:CurrencyCode}
export function LoanOverview({accounts,members,profiles,rows,transactions,currency}:OverviewProps){
 const loans=accounts.filter(a=>!a.archivedAt&&labels[a.type]),cards=loans.filter(a=>a.type==='credit_card'),fixed=loans.filter(a=>a.type!=='credit_card'),summary=netWorthSummary(loans,currency)
 return <>
 <dl className="loan-overview-summary" aria-label="Підсумок кредитів">
  <div><dt>Загальний борг зараз</dt><dd>{formatMoney(summary.totalLiabilities,currency)}</dd></div>
  <div className="loan-product-counts"><span>Кредити та борги <strong>{fixed.length}</strong></span><span>Кредитні картки <strong>{cards.length}</strong></span></div>
 </dl>
 {!loans.length?<Card><h2 className="text-lg font-semibold">Кредитів поки немає</h2><p className="mt-2 text-sm text-secondary">Додайте кредит, іпотеку або кредитну картку з актуальним залишком. Відновлювати історію оплат не потрібно.</p></Card>:[{title:'Кредити та позики',items:fixed},{title:'Кредитні картки',items:cards}].filter(group=>group.items.length).map(group=><section className="loan-overview-section" key={group.title} aria-label={group.title}>
 <h2>{group.title}<span>{group.items.length}</span></h2>
 <div className="loan-overview-grid">{group.items.map(account=>{
  const profile=profiles.find(p=>p.account_id===account.id),next=transactions.filter(t=>t.loanAccountId===account.id&&t.status==='planned'&&!t.deletedAt&&!t.recurrenceSuspended).sort((a,b)=>a.transactionDate.localeCompare(b.transactionDate))[0],isCard=account.type==='credit_card',card=isCard?creditCardSummary(account):null,Icon=isCard?CreditCard:Landmark
  return <Link href={'/loans/'+account.id} key={account.id} className="loan-overview-card" aria-label={'Відкрити кредит: '+account.name}>
   <div className="loan-card-heading"><span className="loan-card-icon"><Icon size={21}/></span><div><h3>{account.name}</h3><p>{labels[account.type]} · {accountOwner(account,members)}</p></div><ChevronRight size={18}/></div>
   <div className="loan-card-balance"><span>Борг зараз</span><strong>{formatMoney(Math.max(0,-account.currentBalance),account.currency)}</strong></div>
   {!isCard&&<span className="loan-quality-label">{account.lastReconciledAt?'Остання звірка: '+new Date(account.lastReconciledAt).toLocaleDateString('uk-UA'):'Борг ще не звірено'}</span>}
   {card?<div className="loan-card-meta"><span>Доступний кредит</span><strong>{card.limitKnown?formatMoney(card.availableCredit,account.currency):'Ліміт не вказано'}</strong>{card.overLimit>0&&<small>Перевищення ліміту: {formatMoney(card.overLimit,account.currency)}</small>}{profile?.card_due_date&&profile.card_minimum!=null&&<small>Мінімум за випискою до {profile.card_due_date}: {formatMoney(profile.card_minimum,account.currency)}</small>}</div>:next?<div className="loan-card-meta"><span>{next.transactionDate<localDay()?'Прострочений план':'Наступний запланований платіж'}</span><strong>{formatMoney(next.amount,next.currency)}</strong><small>{new Date(next.transactionDate+'T12:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'})}</small></div>:<div className="loan-card-meta"><span>{'Запланованих платежів немає'}</span></div>}
   <span className="loan-card-link">{profile?'Відкрити деталі':'Налаштувати кредит'}<ChevronRight size={16}/></span>
  </Link>
 })}</div></section>)}
 </>
}
export function LoansDashboard(){
 const {data:accounts=[],isLoading:loadingAccounts}=useAccounts(),{data:members=[]}=useMembers(),{data:transactions=[]}=useTransactions(),{data,isLoading,error}=useLoanData(),{displayCurrency,can}=useWorkspaceContext()
 return <div className="finance-page"><header className="collection-heading"><div><h1>Кредити та борги</h1><p>Усі зобов’язання сім’ї в одному місці</p></div>{can('account.manage')&&<Link className="collection-add" href="/accounts/new"><Button><Plus size={17} className="mr-1.5"/>Додати кредит</Button></Link>}</header>
 {isLoading||loadingAccounts?<p role="status">Завантажуємо кредити…</p>:error?<Card><p role="alert">Не вдалося завантажити кредити. Спробуйте оновити сторінку.</p></Card>:<LoanOverview accounts={accounts} members={members} profiles={data?.profiles||[]} rows={data?.rows||[]} transactions={transactions} currency={displayCurrency}/>}
 </div>
}
