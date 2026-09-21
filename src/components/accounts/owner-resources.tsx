'use client'
import {ownerResources} from '@/lib/calculations/household'
import {Money,Disclosure} from '@/components/ui/finance-visuals'
import type {Account,CurrencyCode,WorkspaceMember} from '@/types/domain'
export function OwnerResources({accounts,members,currency}:{accounts:Account[];members:WorkspaceMember[];currency:CurrencyCode}){
 const rows=ownerResources(accounts,members,currency)
 return <Disclosure title="Кому належать кошти" className="mb-5"><div className="owner-resources"><div className="owner-resources-heading"><span>Власник</span><span>Для витрат</span><span>Заощадження</span></div>{rows.map(r=><div key={r.id}><strong>{r.name}</strong><Money value={r.own} currency={currency}/><Money value={r.savings} currency={currency}/></div>)}</div><p>Спільні рахунки враховані один раз. Кредитний ліміт не є власними коштами.</p></Disclosure>
}