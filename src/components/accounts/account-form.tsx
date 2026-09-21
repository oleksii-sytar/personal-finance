'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useCreateAccount, useUpdateAccount, useMembers, useCurrentUser } from '@/hooks/use-finance'
import { accountFormSchema } from '@/lib/validations/finance'
import { ACCOUNT_TYPE_META, ASSET_TYPES, LIABILITY_TYPES } from '@/lib/constants/accounts'
import { SUPPORTED_CURRENCIES } from '@/lib/constants/currencies'
import type { Account, AccountType, CurrencyCode } from '@/types/domain'

interface AccountFormProps {
  account?: Account
  onDone?: () => void
}

type Errors = Partial<Record<string, string[]>>

const LOAN_TYPES: AccountType[] = ['bank_loan', 'microloan', 'mortgage']
const INSTITUTION_TYPES: AccountType[] = ['bank_debit', 'savings', 'credit_card', 'bank_loan', 'microloan', 'mortgage']
const COUNTERPARTY_TYPES: AccountType[] = ['personal_debt', 'receivable']

export function AccountForm({ account, onDone }: AccountFormProps) {
  const {data:members=[]}=useMembers()
  const {data:currentUser}=useCurrentUser()
  const [owner,setOwner]=useState(account?.isShared?'shared':account?.ownerUserId||(account?'unknown':'self'))
  const ownerUserId=owner==='self'?currentUser?.id||null:owner==='shared'||owner==='unknown'?null:owner
  const isEdit = !!account
  const router = useRouter()
  const toast = useToast()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank_debit')
  const [currency, setCurrency] = useState<CurrencyCode>(account?.currency ?? 'UAH')
  const [openingBalance, setOpeningBalance] = useState(String(account?.openingBalance ?? ''))
  const [institution, setInstitution] = useState(account?.institution ?? '')
  const [counterparty, setCounterparty] = useState(account?.counterparty ?? '')
  const [principal, setPrincipal] = useState(account?.principal != null ? String(account.principal) : '')
  const [interestRate, setInterestRate] = useState(account?.interestRate != null ? String(account.interestRate) : '')
  const [cardBalanceKind,setCardBalanceKind]=useState<'debt'|'own'>('debt')
  const [creditLimit, setCreditLimit] = useState(account?.creditLimit != null ? String(account.creditLimit) : '')
  const [dueDate, setDueDate] = useState(account?.dueDate ?? '')
  const [isSavings,setIsSavings]=useState(account?.isSavings??account?.type==='savings')
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false)
  const [errors, setErrors] = useState<Errors>({})

  const submitting = createAccount.isPending || updateAccount.isPending
  const showInstitution = INSTITUTION_TYPES.includes(type)
  const showCounterparty = COUNTERPARTY_TYPES.includes(type)
  const isLoan = LOAN_TYPES.includes(type)
  const isLiabilityType = LIABILITY_TYPES.includes(type)
  const isCreditCard = type === 'credit_card'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = accountFormSchema.safeParse({
      name,
      type,
      currency,
      openingBalance,
      institution,
      counterparty,
      principal: principal || undefined,
      interestRate: interestRate || undefined,
      creditLimit: creditLimit || undefined,
      dueDate,
      isDefault,
    })
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }
    const v = parsed.data
    try {
      if (isEdit && account) {
        await updateAccount.mutateAsync({
          id: account.id,
          patch: {
            name: v.name,
            ownerUserId,isShared:owner==='shared',isSavings: ['cash','bank_debit','savings'].includes(type)&&isSavings,
            institution: showInstitution ? v.institution || null : null,
            counterparty: showCounterparty ? v.counterparty || null : null,
            interestRate: isLoan || isCreditCard ? v.interestRate ?? null : null,
            creditLimit: isCreditCard ? v.creditLimit ?? null : null,
            principal: isLoan ? v.principal ?? null : null,
            dueDate: isLoan ? v.dueDate || null : null,
            isDefault: v.isDefault ?? account.isDefault,
          },
        })
        toast.success("Рахунок оновлено", v.name)
      } else {
        await createAccount.mutateAsync({
          name: v.name,
          ownerUserId,isShared:owner==='shared',isSavings:['cash','bank_debit','savings'].includes(type)&&isSavings,
          type: v.type,
          currency: v.currency,
          // Liabilities are entered as a positive "amount owed" and stored negative.
          openingBalance: v.openingBalance===0 ? 0 : isCreditCard ? (cardBalanceKind==='own'?Math.abs(v.openingBalance):-Math.abs(v.openingBalance)) : isLiabilityType ? -Math.abs(v.openingBalance) : v.openingBalance,
          institution: showInstitution ? v.institution || null : null,
          counterparty: showCounterparty ? v.counterparty || null : null,
          principal: isLoan ? v.principal ?? null : null,
          interestRate: isLoan || isCreditCard ? v.interestRate ?? null : null,
          creditLimit: isCreditCard ? v.creditLimit ?? null : null,
          dueDate: isLoan ? v.dueDate || null : null,
          isDefault: v.isDefault,
        })
        toast.success("Рахунок створено", v.name)
      }
      onDone ? onDone() : router.push('/accounts')
    } catch (error) {
      toast.error("Не вдалося зберегти рахунок", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Назва"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Наприклад, monobank, Готівка, Борг братові"
        error={errors.name?.[0]}
        autoFocus
      />

      {['cash','bank_debit','savings'].includes(type)&&<Switch checked={isSavings} onChange={setIsSavings} label="Це заощадження, не кошти для щоденних витрат"/>}
      <Select label="Кому належить рахунок" value={owner} onChange={e=>setOwner(e.target.value)} options={[{value:'self',label:'Мій рахунок'},{value:'shared',label:'Спільний сімейний'},{value:'unknown',label:'Власника ще не вказано'},...members.map(m=>({value:m.userId,label:m.displayName}))]}/>
      <p className="text-xs text-muted">Власник рахунку не обов’язково є тим, хто додав його в застосунок.</p>
      <Select
        label="Тип"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
        disabled={isEdit}
        error={errors.type?.[0]}
      >
        <optgroup label="Активи">
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_META[t].label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Зобов’язання">
          {LIABILITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_META[t].label}
            </option>
          ))}
        </optgroup>
      </Select>
      <p className="-mt-3 text-xs text-muted">{ACCOUNT_TYPE_META[type].description}</p>

      {!isEdit&&isCreditCard&&<Select label="Залишок кредитки" value={cardBalanceKind} onChange={e=>{setCardBalanceKind(e.target.value as 'debt'|'own');setOpeningBalance('')}} options={[{value:'debt',label:'Борг перед банком'},{value:'own',label:'Власні кошти, боргу немає'}]}/>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Валюта"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          disabled={isEdit}
          options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.symbol}` }))}
        />
        {!isEdit && (
          <Input
            label={isCreditCard&&cardBalanceKind==='own'?"Власні кошти на картці":isLiabilityType ? isLoan ? "Залишок тіла зараз" : "Поточна сума боргу" : "Залишок зараз"}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            error={errors.openingBalance?.[0]}
          />
        )}
      </div>

      {!isEdit && <p className="text-xs text-secondary">Введіть фактичний залишок зараз. Старі виписки доповнять історію, але не спишуть ці гроші повторно. Дату початку обліку збережемо автоматично.</p>}

      {showInstitution && (
        <Input
          label="Фінансова установа"
          value={institution ?? ''}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="Наприклад, monobank, ПриватБанк"
        />
      )}

      {showCounterparty && (
        <Input
          label="Контрагент"
          value={counterparty ?? ''}
          onChange={(e) => setCounterparty(e.target.value)}
          placeholder="Кому ви винні або хто винен вам?"
        />
      )}

      {isCreditCard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Кредитний ліміт"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="50000"
          />
          <Input
            label="Відсоткова ставка, %"
            type="number"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="0"
          />
        </div>
      )}

      {isLoan && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Початкове тіло кредиту"
            type="number"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Відсоткова ставка, %"
            type="number"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="0"
          />
          <Input label="Строк погашення" type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      )}

      <div className="rounded-xl border border-glass bg-glass p-4">
        <Switch
          checked={isDefault}
          onChange={setIsDefault}
          label="Мій основний рахунок"
          description="Обирається лише для ваших нових операцій. Налаштування інших учасників не зміняться."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => (onDone ? onDone() : router.back())}>
          Скасувати
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting && <Spinner className="mr-2" />}
          {isEdit ? "Зберегти зміни" : "Створити рахунок"}
        </Button>
      </div>
    </form>
  )
}