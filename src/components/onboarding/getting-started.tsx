'use client'

import Link from 'next/link'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAccounts, useTransactions } from '@/hooks/use-finance'

export function GettingStarted({always=false}:{always?:boolean}) {
  const {data:accounts=[]}=useAccounts()
  const {data:transactions=[]}=useTransactions()
  if(!always && accounts.length>0 && transactions.length>0) return null
  return <Card className="mb-6 border border-[var(--border-accent)]">
    <CardTitle className="mb-2">Почнімо з ваших реальних цифр</CardTitle>
    <p className="mb-4 text-sm text-secondary">Почніть із залишків зараз. Дату початку обліку збережемо автоматично, а стару історію можна додати пізніше.</p>
    <ol className="space-y-5">
      <li><h3 className="font-medium text-primary">1. Додайте рахунки {accounts.length>0?'· готово':''}</h3><p className="mt-1 text-sm text-secondary">Окремо кожну картку, готівку, заощадження або борг. Введіть <strong>фактичний залишок зараз</strong>. Історичні транзакції до цієї дати не змінять його повторно.</p><Link href="/accounts/new"><Button variant="secondary" size="sm" className="mt-2">Додати рахунок</Button></Link></li>
      <li><h3 className="font-medium text-primary">2. Додайте транзакції {transactions.length>0?'· готово':''}</h3><p className="mt-1 text-sm text-secondary">Імпорт: один CSV для одного рахунку та його валюти. Доходи зі знаком «+», витрати зі знаком «−». Готівкові витрати додавайте у транзакціях. Зразок CSV і промпт для PDF доступні у вікні імпорту. Оберіть рахунок явно та перевірте його в попередньому перегляді. Помилковий імпорт можна перенести або скасувати в історії імпортів.</p><Link href="/transactions?import=1"><Button variant="secondary" size="sm" className="mt-2" disabled={!accounts.length}>Імпортувати виписку</Button></Link></li>
      <li><h3 className="font-medium text-primary">3. Звірте з банком</h3><p className="mt-1 text-sm text-secondary">Перевірте категорії та підсумковий залишок. Переказ між своїми рахунками не є доходом чи витратою: запишіть його один раз як «Переказ», а не двома окремими платежами.</p><Link href="/accounts"><Button variant="ghost" size="sm" className="mt-2">Перейти до звірки</Button></Link></li>
      <li><h3 className="font-medium text-primary">4. Сплануйте майбутнє</h3><p className="mt-1 text-sm text-secondary">У «Операціях» додайте зарплату, оренду та платежі з майбутньою датою. Вони потраплять у прогноз, але не змінять фактичний залишок, доки ви не позначите їх виконаними. Середні щоденні витрати та резерв обчислюються автоматично; ви обираєте лише кількість днів запасу.</p></li>
      <li><h3 className="font-medium text-primary">5. Кредити без розкопок у минулому</h3><p className="mt-1 text-sm text-secondary">Поточний залишок тіла є стартом обліку. Імпортуйте чинний графік або його майбутню частину. Старі рядки не означають фактичних оплат. Основний та обрані рахунки кожен учасник налаштовує окремо.</p><Link href="/loans"><Button variant="secondary" size="sm" className="mt-2">Налаштувати кредити</Button></Link></li>
    </ol>
    <p className="mt-5 border-t border-primary pt-4 text-xs text-muted">На iPhone: відкрийте сайт у Safari → «Поділитися» → «На початковий екран». Для збереження та синхронізації потрібен інтернет.</p>
  </Card>
}