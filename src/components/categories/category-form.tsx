'use client'

import { useEffect, useState, useId } from 'react'
import { Trash2 } from 'lucide-react'
import { Dialog, DialogActions } from '@/components/ui/dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/use-finance'
import { categorySchema } from '@/lib/validations/finance'
import { cn } from '@/lib/utils'
import type { Category, CategoryKind } from '@/types/domain'

const SWATCHES = ['#E6A65D', '#4E7A58', '#D97706', '#8B7355', '#5C3A21', '#B45309', '#EF4444', '#166534']

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  category?: Category | null
}

export function CategoryForm({ open, onClose, category }: CategoryFormProps) {
  const isEdit = !!category
  const formId = useId()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const del = useDeleteCategory()
  const toast = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryKind>('expense')
  const [color, setColor] = useState(SWATCHES[0])
  const [icon, setIcon] = useState('tag')
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setConfirmDelete(false)
    if (category) {
      setName(category.name)
      setType(category.type)
      setColor(category.color)
      setIcon(category.icon)
    } else {
      setName('')
      setType('expense')
      setColor(SWATCHES[0])
      setIcon('tag')
    }
  }, [open, category])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = categorySchema.safeParse({ name, type, color, icon })
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }
    try {
      if (isEdit && category) {
        await update.mutateAsync({ id: category.id, patch: parsed.data })
        toast.success("Категорію оновлено")
      } else {
        await create.mutateAsync(parsed.data)
        toast.success("Категорію створено")
      }
      onClose()
    } catch (error) {
      toast.error("Не вдалося зберегти категорію",error)
    }
  }

  async function handleDelete() {
    if (!category) return
    if (!confirmDelete) return setConfirmDelete(true)
    try {
      await del.mutateAsync(category.id)
      toast.success("Категорію видалено")
      onClose()
    } catch (error) {
      toast.error("Не вдалося видалити",error)
    }
  }

  const submitting = create.isPending || update.isPending

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Редагувати категорію" : "Нова категорія"} footer={
        <DialogActions>
          {isEdit && <Button type="button" variant="ghost" onClick={handleDelete} disabled={submitting || del.isPending} className="text-[var(--accent-error)] sm:mr-auto">
            {del.isPending ? <Spinner className="mr-2" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {confirmDelete ? "Підтвердити?" : "Видалити"}
          </Button>}
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting || del.isPending}>Скасувати</Button>
          <Button type="submit" form={formId} variant="primary" disabled={submitting || del.isPending}>
            {submitting && <Spinner className="mr-2" />}
            {isEdit ? "Зберегти" : "Створити"}
          </Button>
        </DialogActions>
      }>
      <form id={formId} onSubmit={submit} className="space-y-4">
        <Input label="Назва" value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} autoFocus />
        <Select
          label="Тип"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryKind)}
          options={[
            { value: 'expense', label: "Витрата" },
            { value: 'income', label: "Дохід" },
          ]}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Колір</label>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setColor(s)}
                aria-label={`Колір ${s}`}
                className={cn('h-11 w-11 rounded-full transition-transform', color === s && 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] ring-[var(--accent-primary)]')}
                style={{ backgroundColor: s }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-11 cursor-pointer rounded-lg border border-glass bg-transparent"
              aria-label="Власний колір"
            />
          </div>
          {errors.color?.[0] && <p className="mt-1 text-sm text-[var(--accent-error)]">{errors.color[0]}</p>}
        </div>


      </form>
    </Dialog>
  )
}