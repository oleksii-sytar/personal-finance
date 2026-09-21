'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useCategories, useCreateCategoryRule, useDeleteCategoryRule, useUpdateCategoryRule, useCategoryRules } from '@/hooks/use-finance'
import type { CategoryRule } from '@/types/domain'
import type { UpdateCategoryRuleInput } from '@/lib/data/repository'

interface FormState {
  id: string
  name: string
  categoryId: string
  descriptionContains: string
  kind: '' | 'income' | 'expense'
  minAmount: string
  maxAmount: string
  priority: string
  isActive: boolean
}

const INITIAL_FORM: FormState = {
  id: '',
  name: '',
  categoryId: '',
  descriptionContains: '',
  kind: '',
  minAmount: '',
  maxAmount: '',
  priority: '100',
  isActive: true,
}

export function CategoryRulesManager() {
  const { data: rules = [] } = useCategoryRules()
  const { data: categories = [] } = useCategories()
  const createRule = useCreateCategoryRule()
  const updateRule = useUpdateCategoryRule()
  const deleteRule = useDeleteCategoryRule()
  const toast = useToast()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules])
  const isEditing = form.id.length > 0

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Невідомо"

  function resetForm() {
    setForm(INITIAL_FORM)
    setErrors({})
  }

  function editRule(rule: CategoryRule) {
    setErrors({})
    setForm({
      id: rule.id,
      name: rule.name,
      categoryId: rule.categoryId,
      descriptionContains: rule.descriptionContains,
      kind: rule.kind ?? '',
      minAmount: rule.minAmount != null ? String(rule.minAmount) : '',
      maxAmount: rule.maxAmount != null ? String(rule.maxAmount) : '',
      priority: String(rule.priority),
      isActive: rule.isActive,
    })
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = "Укажіть назву правила"
    if (!form.categoryId) next.categoryId = "Оберіть категорію"
    if (!form.descriptionContains.trim()) next.descriptionContains = "Додайте хоча б одне ключове слово"

    const min = form.minAmount === '' ? null : Number(form.minAmount)
    const max = form.maxAmount === '' ? null : Number(form.maxAmount)
    if (min != null && Number.isNaN(min)) next.minAmount = "Введіть число"
    if (max != null && Number.isNaN(max)) next.maxAmount = "Введіть число"
    if (min != null && min < 0) next.minAmount = "Значення не може бути від’ємним"
    if (max != null && max < 0) next.maxAmount = "Значення не може бути від’ємним"
    if (min != null && max != null && min > max) next.maxAmount = "Максимум має бути не меншим за мінімум"
    if (form.priority && Number.isNaN(Number(form.priority))) next.priority = "Пріоритет має бути числом"

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      descriptionContains: form.descriptionContains.trim(),
      kind: form.kind || undefined,
      minAmount: form.minAmount === '' ? null : Number(form.minAmount),
      maxAmount: form.maxAmount === '' ? null : Number(form.maxAmount),
      priority: form.priority === '' ? 100 : Number(form.priority),
      isActive: form.isActive,
    }

    try {
      if (isEditing) {
        await updateRule.mutateAsync({ id: form.id, patch: payload as UpdateCategoryRuleInput })
        toast.success("Правило оновлено")
      } else {
        await createRule.mutateAsync(payload)
        toast.success("Правило створено")
      }
      resetForm()
    } catch (error) {
      toast.error("Не вдалося зберегти правило",error)
    }
  }

  async function handleDelete(rule: CategoryRule) {
    if (!window.confirm(`Видалити правило «${rule.name}»?`)) return
    try {
      await deleteRule.mutateAsync(rule.id)
      toast.success("Правило видалено")
      if (form.id === rule.id) resetForm()
    } catch (error) {
      toast.error("Не вдалося видалити правило",error)
    }
  }

  return (
    <Card>
      <CardTitle className="mb-3">Правила автоматичної категоризації</CardTitle>

      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Назва правила"
            value={form.name}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, name: value })) }}
            error={errors.name}
            placeholder="Наприклад, Покупки в супермаркеті"
          />
          <Select
            label="Категорія для операцій"
            value={form.categoryId}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, categoryId: value })) }}
            options={[
              { value: '', label: "Оберіть категорію" },
              ...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.type === 'income' ? 'дохід' : 'витрата'})` })),
            ]}
            error={errors.categoryId}
          />
        </div>

        <Input
          label="Ключові слова через кому або крапку з комою"
          value={form.descriptionContains}
          onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, descriptionContains: value })) }}
          placeholder="Наприклад, сільпо, АТБ"
          error={errors.descriptionContains}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Застосовувати до"
            value={form.kind}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, kind: value as '' | 'income' | 'expense' })) }}
            options={[
              { value: '', label: "Доходів і витрат" },
              { value: 'income', label: "Лише доходів" },
              { value: 'expense', label: "Лише витрат" },
            ]}
          />
          <Input
            label="Мінімальна сума (необов’язково)"
            type="number"
            step="0.01"
            value={form.minAmount}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, minAmount: value })) }}
            error={errors.minAmount}
            placeholder="500"
          />
          <Input
            label="Максимальна сума (необов’язково)"
            type="number"
            step="0.01"
            value={form.maxAmount}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, maxAmount: value })) }}
            error={errors.maxAmount}
            placeholder="10000"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Пріоритет (менше число означає вищий)"
            type="number"
            value={form.priority}
            onChange={(e) => { const value = e.target.value; setForm((prev) => ({ ...prev, priority: value })) }}
            error={errors.priority}
          />
          <label className="flex items-center gap-2 pt-6 text-sm text-secondary">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-[var(--glass-border)] bg-[var(--bg-glass)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20"
            />
            Правило активне
          </label>
        </div>

        <div className="flex justify-end gap-2">
          {isEditing && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Скасувати
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={createRule.isPending || updateRule.isPending}>
            {(createRule.isPending || updateRule.isPending) && <Spinner className="mr-2" />}
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEditing ? "Зберегти правило" : "Додати правило"}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {sortedRules.length === 0 ? (
          <p className="text-sm text-muted">Правил ще немає. Додайте перше для автоматичної категоризації.</p>
        ) : (
          sortedRules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-glass bg-glass p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-primary">{rule.name}</p>
                  <p className="text-sm text-secondary">
                    {categoryName(rule.categoryId)} · ключові слова:{' '}
                    <span className="font-mono text-xs">{rule.descriptionContains}</span>
                  </p>
                  <p className="text-xs text-muted">
                    тип: {rule.kind === 'income' ? 'дохід' : rule.kind === 'expense' ? 'витрата' : 'усі'} · мін.: {rule.minAmount ?? '—'} · макс.: {rule.maxAmount ?? '—'} · пріоритет:{' '}
                    {rule.priority}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={rule.isActive ? 'success' : 'neutral'}>{rule.isActive ? 'активне' : 'призупинено'}</Badge>
                  <button
                    type="button"
                    onClick={() => editRule(rule)}
                    className="rounded-pill border border-glass px-3 py-1.5 text-sm text-secondary hover:text-primary"
                    aria-label={`Редагувати ${rule.name}`}
                  >
                    <Pencil className="mr-1 inline h-3.5 w-3.5" /> Редагувати
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rule)}
                    className="rounded-pill border border-glass px-3 py-1.5 text-sm text-[var(--accent-error)] hover:brightness-110"
                    aria-label={`Видалити ${rule.name}`}
                  >
                    <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Видалити
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}