'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { 
  createTransactionType, 
  updateTransactionType, 
  deleteTransactionType, 
  getTransactionTypes,
  reassignTransactionType
} from '@/actions/transaction-types'
import type { TransactionType, TransactionTypeFamily, CreateTransactionTypeInput } from '@/lib/validations/transaction-type'

interface TransactionTypeManagerProps {
  workspaceId: string
  onClose?: () => void
}

export function TransactionTypeManager({ workspaceId, onClose }: TransactionTypeManagerProps) {
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Form state for creating/editing
  const [formData, setFormData] = useState<CreateTransactionTypeInput>({
    name: '',
    family: 'expense',
    description: '',
    icon: '',
    color: '#8B7355',
    is_system: false,
    is_default: false,
  })

  // Load transaction types
  const loadTransactionTypes = async () => {
    setIsLoading(true)
    setError(null)
    
    const result = await getTransactionTypes(workspaceId)
    
    if (result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Failed to load transaction types')
    } else {
      setTransactionTypes(result.data || [])
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    loadTransactionTypes()
  }, [workspaceId])

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formDataObj = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        formDataObj.set(key, value.toString())
      }
    })

    if (editingId) {
      // Update existing type
      const result = await updateTransactionType(editingId, formDataObj)
      
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to update transaction type')
      } else {
        setEditingId(null)
        resetForm()
        await loadTransactionTypes()
      }
    } else {
      // Create new type
      formDataObj.set('workspace_id', workspaceId)
      const result = await createTransactionType(formDataObj)
      
      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to create transaction type')
      } else {
        setIsCreating(false)
        resetForm()
        await loadTransactionTypes()
      }
    }
  }

  // Handle deletion with reassignment
  const handleDelete = async (id: string) => {
    setError(null)
    
    const result = await deleteTransactionType(id, reassignTargetId || undefined)
    
    if (result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Failed to delete transaction type')
    } else {
      setDeletingId(null)
      setReassignTargetId('')
      await loadTransactionTypes()
    }
  }

  // Start editing a transaction type
  const startEdit = (transactionType: TransactionType) => {
    setFormData({
      name: transactionType.name,
      family: transactionType.family as TransactionTypeFamily,
      description: transactionType.description || '',
      icon: transactionType.icon || '',
      color: transactionType.color || '#8B7355',
      is_system: transactionType.is_system,
      is_default: transactionType.is_default,
    })
    setEditingId(transactionType.id)
    setIsCreating(false)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      family: 'expense',
      description: '',
      icon: '',
      color: '#8B7355',
      is_system: false,
      is_default: false,
    })
  }

  // Cancel editing/creating
  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setDeletingId(null)
    resetForm()
    setError(null)
  }

  // Get available reassignment targets for a type
  const getReassignmentTargets = (typeToDelete: TransactionType) => {
    return transactionTypes.filter(
      t => t.id !== typeToDelete.id && 
           t.family === typeToDelete.family &&
           !t.is_system // Don't allow reassigning to system types that might be deleted
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Transaction Types</h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card className="p-4 mb-6 bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? 'Edit Transaction Type' : 'Create New Transaction Type'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Salary, Groceries"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Family *
                </label>
                <select
                  value={formData.family}
                  onChange={(e) => setFormData({ ...formData, family: e.target.value as TransactionTypeFamily })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingId} // Cannot change family after creation
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Icon (Emoji)
                </label>
                <Input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="💰"
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Color
                </label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Transaction Types List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Transaction Types</h3>
          {!isCreating && !editingId && (
            <Button onClick={() => setIsCreating(true)}>
              Add New Type
            </Button>
          )}
        </div>

        {/* Income Types */}
        <div>
          <h4 className="text-md font-medium text-green-700 mb-2">Income Types</h4>
          <div className="space-y-2">
            {transactionTypes
              .filter(t => t.family === 'income')
              .map(transactionType => (
                <TransactionTypeItem
                  key={transactionType.id}
                  transactionType={transactionType}
                  onEdit={startEdit}
                  onDelete={setDeletingId}
                  isDeleting={deletingId === transactionType.id}
                  reassignmentTargets={getReassignmentTargets(transactionType)}
                  reassignTargetId={reassignTargetId}
                  onReassignTargetChange={setReassignTargetId}
                  onConfirmDelete={handleDelete}
                  onCancelDelete={() => setDeletingId(null)}
                />
              ))}
          </div>
        </div>

        {/* Expense Types */}
        <div>
          <h4 className="text-md font-medium text-red-700 mb-2">Expense Types</h4>
          <div className="space-y-2">
            {transactionTypes
              .filter(t => t.family === 'expense')
              .map(transactionType => (
                <TransactionTypeItem
                  key={transactionType.id}
                  transactionType={transactionType}
                  onEdit={startEdit}
                  onDelete={setDeletingId}
                  isDeleting={deletingId === transactionType.id}
                  reassignmentTargets={getReassignmentTargets(transactionType)}
                  reassignTargetId={reassignTargetId}
                  onReassignTargetChange={setReassignTargetId}
                  onConfirmDelete={handleDelete}
                  onCancelDelete={() => setDeletingId(null)}
                />
              ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

// Individual transaction type item component
interface TransactionTypeItemProps {
  transactionType: TransactionType
  onEdit: (transactionType: TransactionType) => void
  onDelete: (id: string) => void
  isDeleting: boolean
  reassignmentTargets: TransactionType[]
  reassignTargetId: string
  onReassignTargetChange: (id: string) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
}

function TransactionTypeItem({
  transactionType,
  onEdit,
  onDelete,
  isDeleting,
  reassignmentTargets,
  reassignTargetId,
  onReassignTargetChange,
  onConfirmDelete,
  onCancelDelete,
}: TransactionTypeItemProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {transactionType.icon && (
            <span className="text-lg">{transactionType.icon}</span>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-medium">{transactionType.name}</h4>
              {transactionType.is_default && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Default
                </span>
              )}
              {transactionType.is_system && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  System
                </span>
              )}
            </div>
            {transactionType.description && (
              <p className="text-sm text-gray-600">{transactionType.description}</p>
            )}
          </div>
        </div>

        {!isDeleting && (
          <div className="flex space-x-2">
            {!transactionType.is_system && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(transactionType)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(transactionType.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Deletion confirmation with reassignment */}
      {isDeleting && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete "{transactionType.name}"?
          </p>
          
          {reassignmentTargets.length > 0 && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-red-800 mb-1">
                Reassign existing transactions to:
              </label>
              <select
                value={reassignTargetId}
                onChange={(e) => onReassignTargetChange(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required={reassignmentTargets.length > 0}
              >
                <option value="">Select a replacement type...</option>
                {reassignmentTargets.map(target => (
                  <option key={target.id} value={target.id}>
                    {target.icon} {target.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => onConfirmDelete(transactionType.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={reassignmentTargets.length > 0 && !reassignTargetId}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelDelete}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}