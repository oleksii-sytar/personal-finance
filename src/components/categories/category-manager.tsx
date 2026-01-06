'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  useCategories, 
  useUpdateCategory, 
  useDeleteCategory, 
  useMergeCategories 
} from '@/hooks/use-categories'
import { useWorkspace } from '@/contexts/workspace-context'
import { InlineCategoryCreator } from './inline-category-creator'
import type { Category } from '@/types'
import type { TransactionType } from '@/types/transactions'

interface CategoryManagerProps {
  type?: TransactionType
  onCategorySelect?: (category: Category) => void
  className?: string
}

interface EditingCategory {
  id: string
  name: string
  icon: string
  color: string
}

/**
 * CategoryManager component for comprehensive category management
 * Implements Requirements 7.2, 7.3, 7.4, 7.5: Category editing, deletion, and merging
 */
export function CategoryManager({
  type,
  onCategorySelect,
  className
}: CategoryManagerProps) {
  const { currentWorkspace } = useWorkspace()
  const { data: categories = [], isLoading } = useCategories() // Get all categories, we'll filter locally
  const updateCategoryMutation = useUpdateCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const mergeCategoriesMutation = useMergeCategories()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createCategoryType, setCreateCategoryType] = useState<TransactionType>(type || 'expense')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>(type || 'all') // New filter state
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [mergingCategory, setMergingCategory] = useState<Category | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [error, setError] = useState('')

  // Filter categories by type if specified
  const filteredCategories = filterType === 'all' 
    ? categories
    : categories.filter(cat => cat.type === filterType)

  // Separate default and custom categories
  const defaultCategories = filteredCategories.filter(cat => cat.is_default)
  const customCategories = filteredCategories.filter(cat => !cat.is_default)

  const handleEditStart = (category: Category) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      icon: category.icon || '',
      color: category.color || (category.type === 'income' ? '#4E7A58' : '#8B7355')
    })
  }

  const handleEditSave = async () => {
    if (!editingCategory) return

    setError('')

    try {
      const formData = new FormData()
      formData.set('name', editingCategory.name.trim())
      formData.set('icon', editingCategory.icon)
      formData.set('color', editingCategory.color)

      const result = await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        formData
      })

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to update category')
        return
      }

      setEditingCategory(null)
    } catch (error) {
      console.error('Category update error:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleEditCancel = () => {
    setEditingCategory(null)
    setError('')
  }

  // Requirement 7.4: Only allow deletion if no transactions are assigned
  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return

    setError('')

    try {
      const result = await deleteCategoryMutation.mutateAsync(deletingCategory.id)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete category')
        return
      }

      setDeletingCategory(null)
    } catch (error) {
      console.error('Category deletion error:', error)
      setError('An unexpected error occurred')
    }
  }

  // Requirement 7.5: Merge categories by reassigning all transactions
  const handleMergeConfirm = async () => {
    if (!mergingCategory || !mergeTargetId) return

    setError('')

    try {
      const result = await mergeCategoriesMutation.mutateAsync({
        fromCategoryId: mergingCategory.id,
        toCategoryId: mergeTargetId
      })

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to merge categories')
        return
      }

      setMergingCategory(null)
      setMergeTargetId('')
    } catch (error) {
      console.error('Category merge error:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleCategoryCreated = (category: Category) => {
    setShowCreateForm(false)
    if (onCategorySelect) {
      onCategorySelect(category)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-glass-elevated backdrop-blur-[16px] border border-glass rounded-xl p-6 ${className}`}>
        <div className="text-center text-secondary">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className={`bg-glass-elevated backdrop-blur-[16px] border border-glass rounded-xl p-6 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">
          Category Management
          {type && <span className="text-sm text-secondary ml-2">({type})</span>}
        </h2>
        <div className="flex items-center gap-3">
          {/* Category Filter Toggle (only show if not filtered by type prop) */}
          {!type && (
            <div className="flex bg-glass-interactive border border-glass rounded-lg p-1">
              <button
                onClick={() => {
                  setFilterType('all')
                  setCreateCategoryType('expense')
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-accent-primary text-inverse shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilterType('expense')
                  setCreateCategoryType('expense')
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  filterType === 'expense'
                    ? 'bg-accent-primary text-inverse shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Expense
              </button>
              <button
                onClick={() => {
                  setFilterType('income')
                  setCreateCategoryType('income')
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  filterType === 'income'
                    ? 'bg-accent-primary text-inverse shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Income
              </button>
            </div>
          )}
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="text-sm"
          >
            + New Category
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-accent-error text-sm p-3 bg-accent-error/10 rounded-lg border border-accent-error/20">
          {error}
        </div>
      )}

      {/* Create Category Form */}
      {showCreateForm && (
        <InlineCategoryCreator
          type={type || createCategoryType}
          onCategoryCreated={handleCategoryCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-secondary mb-3">Custom Categories</h3>
          <div className="space-y-2">
            {customCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 bg-glass-interactive border border-glass rounded-lg hover:border-accent-primary/50 transition-colors"
              >
                {/* Category Display/Edit */}
                {editingCategory?.id === category.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="flex-1 h-8 text-sm"
                      maxLength={100}
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editingCategory.icon}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, icon: e.target.value } : null)}
                      className="w-12 h-8 text-center bg-glass-interactive border border-glass rounded text-sm"
                      placeholder="🏷️"
                      maxLength={10}
                    />
                    <input
                      type="color"
                      value={editingCategory.color}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, color: e.target.value } : null)}
                      className="w-8 h-8 rounded border border-glass"
                    />
                    <div className="flex gap-1">
                      <Button
                        onClick={handleEditSave}
                        disabled={updateCategoryMutation.isPending}
                        size="sm"
                        className="h-8 px-2 text-xs"
                      >
                        ✓
                      </Button>
                      <Button
                        onClick={handleEditCancel}
                        variant="secondary"
                        size="sm"
                        className="h-8 px-2 text-xs"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => onCategorySelect?.(category)}
                    >
                      {category.icon && (
                        <span className="text-lg">{category.icon}</span>
                      )}
                      <div
                        className="w-3 h-3 rounded-full border border-glass"
                        style={{ backgroundColor: category.color || '#8B7355' }}
                      />
                      <span className="text-primary font-medium">{category.name}</span>
                      {/* Show category type when viewing all categories */}
                      {filterType === 'all' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          category.type === 'income' 
                            ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                            : 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                        }`}>
                          {category.type}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditStart(category)}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-secondary hover:text-primary"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => setMergingCategory(category)}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-secondary hover:text-primary"
                      >
                        Merge
                      </Button>
                      <Button
                        onClick={() => setDeletingCategory(category)}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-accent-error hover:text-accent-error"
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Categories */}
      {defaultCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-secondary mb-3">Default Categories</h3>
          <div className="space-y-2">
            {defaultCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 bg-glass border border-glass rounded-lg opacity-75"
              >
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => onCategorySelect?.(category)}
                >
                  {category.icon && (
                    <span className="text-lg">{category.icon}</span>
                  )}
                  <div
                    className="w-3 h-3 rounded-full border border-glass"
                    style={{ backgroundColor: category.color || '#8B7355' }}
                  />
                  <span className="text-primary font-medium">{category.name}</span>
                  {/* Show category type when viewing all categories */}
                  {filterType === 'all' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      category.type === 'income' 
                        ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                        : 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                    }`}>
                      {category.type}
                    </span>
                  )}
                  <span className="text-xs text-secondary">(Default)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <div className="text-secondary mb-4">
            No categories yet. Create your first category to get started.
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
          >
            Create Category
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingCategory}
        onCancel={() => setDeletingCategory(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteCategoryMutation.isPending}
      />

      {/* Merge Confirmation Dialog */}
      {mergingCategory && mergeTargetId && (
        <ConfirmationDialog
          isOpen={!!mergingCategory}
          onCancel={() => {
            setMergingCategory(null)
            setMergeTargetId('')
          }}
          onConfirm={handleMergeConfirm}
          title="Merge Categories"
          message={`Merge "${mergingCategory?.name}" into "${filteredCategories.find(c => c.id === mergeTargetId)?.name}"? All transactions will be reassigned.`}
          confirmText="Merge"
          cancelText="Cancel"
          variant="info"
          isLoading={mergeCategoriesMutation.isPending}
        />
      )}

      {/* Merge Category Selection */}
      {mergingCategory && !mergeTargetId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-md bg-glass-elevated border border-glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Merge "{mergingCategory.name}"
            </h3>
            <p className="text-secondary mb-4">
              Select the target category to merge into. All transactions will be reassigned.
            </p>
            <div className="space-y-3">
              {filteredCategories
                .filter(cat => cat.id !== mergingCategory?.id)
                .map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMergeTargetId(cat.id)}
                    className="w-full p-3 text-left bg-glass-interactive border border-glass rounded-lg hover:border-accent-primary transition-colors flex items-center gap-2"
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    <div
                      className="w-3 h-3 rounded-full border border-glass"
                      style={{ backgroundColor: cat.color || '#8B7355' }}
                    />
                    <span className="text-primary">{cat.name}</span>
                    {cat.is_default && (
                      <span className="text-xs text-secondary ml-auto">(Default)</span>
                    )}
                  </button>
                ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setMergingCategory(null)
                  setMergeTargetId('')
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}