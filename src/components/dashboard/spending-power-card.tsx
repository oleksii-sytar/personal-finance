'use client'

import Link from 'next/link'
import { Wallet, ChevronRight, CreditCard } from 'lucide-react'
import { InfoButton, Money } from '@/components/ui/finance-visuals'
import { creditCardSummary, isSpendingAccount, spendingPowerSummary, personalSpendingAccounts } from '@/lib/money/balances'
import { formatMoney } from '@/lib/money/format'
import type { Account, CurrencyCode } from '@/types/domain'

export function SpendingPowerCard({ accounts, displayCurrency, currentUserId }: { accounts: Account[]; displayCurrency: CurrencyCode; currentUserId?:string }) {
  const summary = spendingPowerSummary(accounts, displayCurrency)
  const personalAccounts=personalSpendingAccounts(accounts,currentUserId)
  const personal=spendingPowerSummary(personalAccounts,displayCurrency)
  const cards = accounts.filter(a => !a.archivedAt && a.type === 'credit_card')
  const ownAccounts = accounts.filter(a => isSpendingAccount(a) && a.currentBalance > 0)
  return (
    <section className="cash-hero spending-power" aria-label="Гроші та доступний кредит">
      <div className="finance-card-heading">
        <span className="finance-label"><Wallet size={17} />Гроші сім’ї</span>
        <InfoButton title="Як рахуються доступні гроші">
          <p>Власні гроші: додатні залишки готівки, дебетових рахунків і власні кошти на кредитках. Заощадження та інвестиції на окремих рахунках не входять до повсякденних грошей.</p>
          <p>Доступно до використання = власні гроші + невикористана частина кредитних лімітів. Кредитні кошти не є доходом або вашим майном.</p>
          <p>Для кожної кредитки окремо: доступний кредит = ліміт мінус борг, але не менше нуля. Перевищення ліміту не зменшує доступні гроші на інших рахунках. Усі борги повністю залишаються в обліку та чистих активах.</p>
          <p>Ліміт без указаного значення не враховується. Це розрахунок за внесеними залишками й лімітами; банк може мати додаткові блокування або обмеження. Майбутні надходження не включені. Валюти перераховано у {displayCurrency}.</p>
          <ul className="spending-own-breakdown">{ownAccounts.map(a => <li key={a.id}><span>{a.name}</span><strong>{formatMoney(a.currentBalance, a.currency)}</strong></li>)}</ul>
          <Link className="finance-link" href="/accounts">Усі рахунки<ChevronRight size={16} /></Link>
        </InfoButton>
      </div>
      <p data-testid="own-funds"><Money value={summary.ownFunds} currency={displayCurrency} className="money-hero" /></p>
      <p className="finance-caption spending-own-caption">Без позичених коштів</p>
      {currentUserId&&<div className="personal-money">
       <div><span>Мої гроші</span><strong data-testid="personal-own-funds"><Money value={personal.ownFunds} currency={displayCurrency}/></strong></div>
       <InfoButton title="Мої рахунки">
        <p>Готівка й власні кошти на картках, де власником указані ви. Спільні рахунки, рахунки інших учасників і кредитні ліміти сюди не входять.</p>
        {personalAccounts.length?<ul className="spending-own-breakdown">{personalAccounts.map(a=><li key={a.id}><Link className="finance-link" href={'/accounts/'+a.id}>{a.name}</Link><strong>{formatMoney(Math.max(0,a.currentBalance),a.currency)}</strong></li>)}</ul>:<p>Особистих рахунків ще не вказано. Відкрийте рахунок і встановіть його власника.</p>}
        <Link className="finance-link" href="/accounts">Керувати рахунками<ChevronRight size={16}/></Link>
       </InfoButton>
      </div>}
      <dl className="spending-total">
        <dt>Доступно до використання<small>Власні + доступний кредит</small></dt>
        <dd data-testid="total-available"><Money value={summary.totalAvailable} currency={displayCurrency} /></dd>
      </dl>
      <details className="spending-credit-details">
        <summary>
          <span className="spending-credit-label"><CreditCard size={16} />Кредитні кошти</span>
          <span className="spending-credit-amount" data-testid="available-credit"><Money value={summary.availableCredit} currency={displayCurrency} /><ChevronRight size={16} /></span>
        </summary>
        <div className="spending-credit-breakdown">
          <p className="finance-caption">Доступна невикористана частина лімітів, без власних коштів на картках.</p>
          {cards.length === 0 ? <p className="finance-caption">Кредитних карток немає.</p> : cards.map(account => {
            const card = creditCardSummary(account)
            return <Link className="spending-credit-line" key={account.id} href={'/accounts/' + account.id}>
              <div><strong>{account.name}</strong><small>{card.limitKnown ? 'Ліміт ' + formatMoney(card.limit, account.currency) : 'Ліміт не вказано'}</small>{card.used > 0 && <small className="money-warning">Борг {formatMoney(-card.used, account.currency)}</small>}{card.overLimit > 0 && <small className="money-warning">Перевищення {formatMoney(card.overLimit, account.currency)}</small>}</div>
              <div><small>Доступний кредит</small><Money value={card.availableCredit} currency={account.currency} /></div>
            </Link>
          })}
        </div>
      </details>
      <div className="cash-hero-footer spending-footer"><span>Загальний ліміт: {formatMoney(summary.creditLimit, displayCurrency)}{summary.unknownLimitCount > 0 && <small>Не вказано для {summary.unknownLimitCount} карток</small>}</span><Link href="/accounts">Рахунки<ChevronRight size={15} /></Link></div>
    </section>
  )
}