/**
 * Zod schemas for finance mutation boundaries. Validate before business logic;
 * `.flatten()` gives field-keyed errors for forms.
 */

import { z } from 'zod'
import {validDay} from '@/lib/planning/model'
import {parseSignedBalance} from '@/lib/reconciliation/model'

export const currencyEnum = z.enum(['UAH', 'USD', 'EUR', 'GBP', 'PLN'])

export const accountTypeEnum = z.enum([
  'cash',
  'bank_debit',
  'savings',
  'crypto',
  'investment',
  'receivable',
  'credit_card',
  'bank_loan',
  'microloan',
  'personal_debt',
  'mortgage',
])

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Укажіть назву").max(60, "Назва задовга"),
  type: accountTypeEnum,
  currency: currencyEnum,
  openingBalance: z.preprocess(v=>parseSignedBalance(v)??NaN,z.number({invalid_type_error:"Введіть залишок. Якщо коштів немає, вкажіть 0."}).finite("Введіть коректну суму")),
  institution: z.string().trim().max(80, "Не більше ніж 80 символів").optional().or(z.literal('')),
  counterparty: z.string().trim().max(80, "Не більше ніж 80 символів").optional().or(z.literal('')),
  principal: z.coerce.number({invalid_type_error:"Введіть коректну суму"}).finite("Введіть коректну суму").nonnegative("Сума не може бути від’ємною").lt(1e12,"Завелика сума").optional(),
  interestRate: z.coerce.number({invalid_type_error:"Введіть коректну ставку"}).finite("Введіть коректну ставку").min(0,"Ставка не може бути від’ємною").max(1000,"Ставка має бути не більшою за 1000%").optional(),
  creditLimit: z.coerce.number({invalid_type_error:"Введіть коректний ліміт"}).finite("Введіть коректний ліміт").nonnegative("Ліміт не може бути від’ємним").lt(1e12,"Завеликий ліміт").optional(),
  dueDate: z.string().refine(v=>!v||validDay(v),"Оберіть коректну дату").optional(),
  isDefault: z.boolean().optional(),
})
export type AccountFormValues = z.infer<typeof accountFormSchema>

export const transactionKindEnum = z.enum(['income', 'expense', 'transfer'])

export const transactionSchema = z
  .object({
    loanAccountId:z.string().uuid("Оберіть кредит ще раз").optional().nullable(),
    loanInstallmentId:z.string().uuid("Оберіть платіж графіка ще раз").optional().nullable(),
    accountingClass:z.enum(['ordinary','principal']).optional(),
    forecastBehavior:z.enum(['auto','scheduled','one_off']).optional(),
    flowKey:z.string().trim().max(120).optional().nullable(),
    plannedTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Укажіть час у форматі ГГ:ХХ").optional().nullable(),
    planExchangeMode: z.enum(['nbu','manual']).optional().nullable(),
    planExchangeRate: z.number().finite().positive().optional().nullable(),
    planExchangeDate: z.string().refine(validDay, "Оберіть коректну дату курсу").optional().nullable(),
    accountId: z.string().min(1, "Оберіть рахунок"),
    counterAccountId: z.string().optional().nullable(),
    counterAmount: z.coerce.number({invalid_type_error:"Введіть суму зарахування"}).finite("Введіть коректну суму").positive("Сума має бути більшою за нуль").lt(1e12,"Завелика сума").optional().nullable(),
    categoryId: z.string().optional().nullable(),
    transactionTypeId: z.string().optional().nullable(),
    kind: transactionKindEnum,
    amount: z.coerce.number({invalid_type_error:"Введіть суму, наприклад 3000,00"}).finite("Введіть коректну суму").positive("Сума має бути більшою за нуль").lt(1e12,"Завелика сума"),
    currency: currencyEnum,
    originalAmount: z.coerce.number().positive().optional().nullable(),
    originalCurrency: currencyEnum.optional().nullable(),
    description: z.string().trim().min(1, "Додайте короткий опис").max(120),
    notes: z.string().trim().max(8000, "Примітка має містити до 8 000 символів").optional().nullable(),
    transactionDate: z.string().refine(validDay, "Оберіть коректну дату"),
    status: z.enum(['completed', 'planned']).optional(),
    plannedDate: z.string().optional().nullable(),
  })
  .refine((v) => v.kind !== 'transfer' || (!!v.counterAccountId && v.counterAccountId !== v.accountId), {
    message: "Для переказу потрібен інший рахунок одержувача",
    path: ['counterAccountId'],
  })
export type TransactionFormValues = z.infer<typeof transactionSchema>

export const quickEntrySchema = z.object({
  amount: z.coerce.number().positive("Введіть суму"),
  kind: z.enum(['income', 'expense']),
  accountId: z.string().min(1, "Оберіть рахунок"),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().max(120).optional(),
})
export type QuickEntryValues = z.infer<typeof quickEntrySchema>

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажіть назву").max(40),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Оберіть колір"),
  icon: z.string().min(1),
})
export type CategoryFormValues = z.infer<typeof categorySchema>

export const userSettingsSchema = z.object({
  displayCurrency: currencyEnum,

  safetyBufferDays: z.coerce.number().int().min(1, "Щонайменше 1 день").max(365, "Не більше ніж 365 днів"),
})
export type UserSettingsValues = z.infer<typeof userSettingsSchema>

export const reconcileSchema = z.object({
  newBalance: z.preprocess(v=>parseSignedBalance(v)??NaN,z.number().finite("Введіть фактичний залишок, наприклад -41116,45")),
  note: z.string().trim().max(200).optional(),
})
export type ReconcileValues = z.infer<typeof reconcileSchema>

export const inviteSchema = z.object({
  email: z.string().trim().email("Введіть коректну електронну адресу"),
  role: z.enum(['manager', 'member', 'viewer']),
})
export type InviteValues = z.infer<typeof inviteSchema>
