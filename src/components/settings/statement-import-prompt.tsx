'use client'

import { Clipboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast'

const STATEMENT_TO_CSV_PROMPT = `Ти допомагаєш перетворювати банківські виписки на структуровані фінансові дані.

Перетвори завантажену виписку будь-якою мовою на CSV у кодуванні UTF-8 з точним заголовком:
Date;Description;Amount

Вимоги:
1. Date: дата у форматі YYYY-MM-DD.
2. Amount: додатне число для надходжень, від’ємне для списань; рівно два знаки після десяткового роздільника.
3. Збережи всі операції. Не об’єднуй окремі платежі.
4. У Description зазнач зрозумілу назву продавця або призначення платежу.
5. Включи ВСІ фактичні комісії, проценти, повернення та списання. Не пропускай жодного реального руху коштів.
6. Пропускай лише заголовки, порожні рядки, підсумкові залишки та рядки без операцій.
7. Підготуй ОКРЕМИЙ CSV для кожного рахунку та валюти рахунку. Укажи рахунок і валюту поза CSV. Не змішуй валюти: імпортер застосовує валюту вибраного рахунку до всіх рядків.
8. Для валютної покупки використовуй фактично списану суму у валюті рахунку. Не додавай суму у валюті покупки як ще одну операцію. Не вигадуй курси чи відсутні суми.
9. Опис із крапкою з комою або лапками оформи за правилами CSV. Кожна операція має займати один рядок.
10. Неоднозначні рядки винеси на ручну перевірку. Збережи описи переказів, щоб користувач міг відокремити внутрішні перекази перед переглядом витрат.

Використовуй лише три колонки Date;Description;Amount. Не додавай колонку Currency: імпортер її не підтримує.`

export function StatementImportPrompt({embedded=false}:{embedded?:boolean}) {
  const Surface=embedded?'section':Card
  const toast = useToast()

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(STATEMENT_TO_CSV_PROMPT)
      toast.success("Промпт скопійовано")
    } catch {
      toast.error("Не вдалося скопіювати. Виділіть текст і скопіюйте вручну.")
    }
  }

  return (
    <Surface className="statement-prompt">
      {!embedded&&<CardTitle className="mb-2">Промпт для конвертації виписки за допомогою ШІ</CardTitle>}
      <p className="mb-3 text-sm text-secondary">
        Використайте цей промпт у ChatGPT, Claude або Gemini, щоб перетворити виписку у формат імпорту.
      </p>
      <textarea
        aria-label="Промпт для конвертації виписки"
        readOnly
        className="form-input h-52 min-w-0 w-full resize-y rounded-xl font-mono text-base"
        value={STATEMENT_TO_CSV_PROMPT}
      />
      <div className="mt-3 flex">
        <Button type="button" className="w-full" variant="secondary" onClick={copyPrompt}>
          <Clipboard className="mr-2 h-4 w-4" />
          Копіювати промпт
        </Button>
      </div>
    </Surface>
  )
}