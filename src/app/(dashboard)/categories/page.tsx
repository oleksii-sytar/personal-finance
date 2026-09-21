'use client'

import { useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { CategoryForm } from '@/components/categories/category-form'
import { useWorkspaceContext } from '@/contexts/workspace-context'
import { useCategories } from '@/hooks/use-finance'
import type { Category } from '@/types/domain'

export default function CategoriesPage() {
  const { can } = useWorkspaceContext()
  const { data: categories = [], isLoading } = useCategories()
  const [editing, setEditing] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)

  const manage = can('category.manage')
  const income = categories.filter((c) => c.type === 'income')
  const expense = categories.filter((c) => c.type === 'expense')

  function open(category: Category | null) {
    if (!manage) return
    setEditing(category)
    setShowForm(true)
  }

  const section = (title: string, list: Category[]) => (
    <Card>
      <CardTitle className="mb-3">{title}</CardTitle>
      {list.length === 0 ? (
        <p className="px-1 py-3 text-sm text-muted">Категорії ще не додані.</p>
      ) : (
        <ul className="space-y-1">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => open(c)}
                disabled={!manage}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-glass disabled:cursor-default"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="flex-1 text-sm font-medium text-primary">{c.name}</span>
                {c.isDefault && <Badge tone="neutral">Основний</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="Категорії" subtitle="Упорядкуйте доходи та витрати" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Категорії"
        subtitle="Упорядкуйте доходи та витрати"
        action={
          manage ? (
            <Button variant="primary" onClick={() => open(null)}>
              <Plus className="mr-1.5 h-4 w-4" /> Додати
            </Button>
          ) : undefined
        }
      />

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="Категорій ще немає" />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {section("Витрата", expense)}
          {section("Дохід", income)}
        </div>
      )}

      <CategoryForm open={showForm} onClose={() => setShowForm(false)} category={editing} />
    </>
  )
}