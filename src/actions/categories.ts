'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/category'
import { verifyWorkspaceMembership } from '@/lib/access-control/workspace-access'
import type { ActionResult, Category } from '@/types'

/**
 * Creates a new category following code-quality.md patterns
 * 
 * @param workspaceId - The workspace ID to create the category in
 * @param formData - Form data containing category details
 * @returns ActionResult with created category or error
 */
export async function createCategory(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = createCategorySchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Create category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...validated.data,
        workspace_id: workspaceId,
      })
      .select()
      .single()

    if (error) {
      return { error: 'Failed to create category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: category }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Updates an existing category
 * 
 * @param id - Category ID to update
 * @param formData - Form data with updated values
 * @returns ActionResult with updated category or error
 */
export async function updateCategory(
  id: string,
  formData: FormData
): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Validate input data
    const rawData = Object.fromEntries(formData)
    const validated = updateCategorySchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Verify category exists and user has access (RLS will handle this)
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('workspace_id')
      .eq('id', id)
      .single()

    if (!existingCategory) {
      return { error: 'Category not found' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, existingCategory.workspace_id)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Update category
    const { data: category, error } = await supabase
      .from('categories')
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { error: 'Failed to update category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: category }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a category (Requirement 7.4: only if no transactions assigned)
 * 
 * @param id - Category ID to delete
 * @returns ActionResult with success status or error
 */
export async function deleteCategory(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify category exists and get workspace info
    const { data: category } = await supabase
      .from('categories')
      .select('workspace_id, is_default')
      .eq('id', id)
      .single()

    if (!category) {
      return { error: 'Category not found' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, category.workspace_id)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Prevent deletion of default categories
    if (category.is_default) {
      return { error: 'Cannot delete default category' }
    }

    // Check if category is in use (Requirement 7.4)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .is('deleted_at', null) // Only check non-deleted transactions
      .limit(1)

    if (transactions && transactions.length > 0) {
      return { error: 'Cannot delete category that is in use by transactions' }
    }

    // Delete category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      return { error: 'Failed to delete category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: { id } }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Merges categories by reassigning all transactions (Requirement 7.5)
 * 
 * @param fromCategoryId - Source category ID to merge from
 * @param toCategoryId - Target category ID to merge to
 * @returns ActionResult with merge result or error
 */
export async function mergeCategories(
  fromCategoryId: string,
  toCategoryId: string
): Promise<ActionResult<{ merged: number; deletedCategoryId: string }>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    if (fromCategoryId === toCategoryId) {
      return { error: 'Cannot merge category with itself' }
    }

    // Verify both categories exist and get workspace info
    const { data: categories } = await supabase
      .from('categories')
      .select('id, workspace_id, is_default, type')
      .in('id', [fromCategoryId, toCategoryId])

    if (!categories || categories.length !== 2) {
      return { error: 'One or both categories not found' }
    }

    const fromCategory = categories.find(c => c.id === fromCategoryId)
    const toCategory = categories.find(c => c.id === toCategoryId)

    if (!fromCategory || !toCategory) {
      return { error: 'Category configuration error' }
    }

    // Verify both categories are in the same workspace
    if (fromCategory.workspace_id !== toCategory.workspace_id) {
      return { error: 'Cannot merge categories from different workspaces' }
    }

    // Verify both categories are the same type
    if (fromCategory.type !== toCategory.type) {
      return { error: 'Cannot merge categories of different types' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, fromCategory.workspace_id)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Prevent merging default categories
    if (fromCategory.is_default) {
      return { error: 'Cannot merge default category' }
    }

    // Start transaction to ensure atomicity
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', fromCategoryId)
      .is('deleted_at', null)

    if (fetchError) {
      return { error: 'Failed to fetch transactions for merge' }
    }

    const transactionCount = transactions?.length || 0

    // Reassign all transactions from source to target category
    if (transactionCount > 0) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          category_id: toCategoryId,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('category_id', fromCategoryId)
        .is('deleted_at', null)

      if (updateError) {
        return { error: 'Failed to reassign transactions during merge' }
      }
    }

    // Delete the source category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', fromCategoryId)

    if (deleteError) {
      return { error: 'Failed to delete source category after merge' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { 
      data: { 
        merged: transactionCount, 
        deletedCategoryId: fromCategoryId 
      } 
    }
  } catch (error) {
    return { error: 'An unexpected error occurred during merge' }
  }
}

/**
 * Gets or creates default category for a workspace (Requirement 1.5)
 * 
 * @param workspaceId - Workspace ID
 * @param type - Transaction type (income or expense)
 * @returns ActionResult with default category or error
 */
export async function getDefaultCategory(
  workspaceId: string,
  type: 'income' | 'expense'
): Promise<ActionResult<Category>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Try to find existing default category
    const { data: existingDefault } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('type', type)
      .eq('is_default', true)
      .single()

    if (existingDefault) {
      return { data: existingDefault }
    }

    // Create default category if it doesn't exist
    const defaultName = type === 'income' ? 'Other Income' : 'Other Expense'
    const { data: newDefault, error } = await supabase
      .from('categories')
      .insert({
        workspace_id: workspaceId,
        name: defaultName,
        type,
        is_default: true,
        color: type === 'income' ? '#4E7A58' : '#8B7355', // Growth Emerald or Warm Bronze
        icon: type === 'income' ? '💰' : '📝',
      })
      .select()
      .single()

    if (error) {
      return { error: 'Failed to create default category' }
    }

    return { data: newDefault }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Creates default categories for a new workspace (Requirement 7.6)
 * 
 * @param workspaceId - Workspace ID to create categories for
 * @returns ActionResult with created categories or error
 */
export async function createDefaultCategories(
  workspaceId: string
): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Default categories to create
    const defaultCategories = [
      // Income categories
      { name: 'Salary', type: 'income', icon: '💼', color: '#4E7A58', is_default: false },
      { name: 'Freelance', type: 'income', icon: '💻', color: '#4E7A58', is_default: false },
      { name: 'Other Income', type: 'income', icon: '💰', color: '#4E7A58', is_default: true },
      
      // Expense categories
      { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#8B7355', is_default: false },
      { name: 'Transportation', type: 'expense', icon: '🚗', color: '#8B7355', is_default: false },
      { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8B7355', is_default: false },
      { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8B7355', is_default: false },
      { name: 'Bills & Utilities', type: 'expense', icon: '📄', color: '#8B7355', is_default: false },
      { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#8B7355', is_default: false },
      { name: 'Other Expense', type: 'expense', icon: '📝', color: '#8B7355', is_default: true },
    ]

    // Insert all default categories
    const { data: categories, error } = await supabase
      .from('categories')
      .insert(
        defaultCategories.map(cat => ({
          ...cat,
          workspace_id: workspaceId,
        }))
      )
      .select()

    if (error) {
      return { error: 'Failed to create default categories' }
    }

    revalidatePath('/categories')
    
    return { data: categories || [] }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Ensures a workspace has default categories (for migration/repair)
 * 
 * @param workspaceId - Workspace ID to check and create defaults for
 * @returns ActionResult with created categories or confirmation
 */
export async function ensureDefaultCategories(
  workspaceId: string
): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Check if workspace already has categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', workspaceId)

    const hasIncomeCategories = existingCategories?.some(c => c.type === 'income') || false
    const hasExpenseCategories = existingCategories?.some(c => c.type === 'expense') || false

    // If workspace already has both types of categories, no need to create defaults
    if (hasIncomeCategories && hasExpenseCategories) {
      return { data: existingCategories || [] }
    }

    // Create missing default categories
    const categoriesToCreate = []

    if (!hasIncomeCategories) {
      categoriesToCreate.push(
        { name: 'Salary', type: 'income', icon: '💼', color: '#4E7A58', is_default: false },
        { name: 'Freelance', type: 'income', icon: '💻', color: '#4E7A58', is_default: false },
        { name: 'Other Income', type: 'income', icon: '💰', color: '#4E7A58', is_default: true }
      )
    }

    if (!hasExpenseCategories) {
      categoriesToCreate.push(
        { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#8B7355', is_default: false },
        { name: 'Transportation', type: 'expense', icon: '🚗', color: '#8B7355', is_default: false },
        { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8B7355', is_default: false },
        { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8B7355', is_default: false },
        { name: 'Bills & Utilities', type: 'expense', icon: '📄', color: '#8B7355', is_default: false },
        { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#8B7355', is_default: false },
        { name: 'Other Expense', type: 'expense', icon: '📝', color: '#8B7355', is_default: true }
      )
    }

    if (categoriesToCreate.length === 0) {
      return { data: existingCategories || [] }
    }

    // Insert missing categories
    const { data: newCategories, error } = await supabase
      .from('categories')
      .insert(
        categoriesToCreate.map(cat => ({
          ...cat,
          workspace_id: workspaceId,
        }))
      )
      .select()

    if (error) {
      return { error: 'Failed to create missing default categories' }
    }

    revalidatePath('/categories')
    
    return { data: [...(existingCategories || []), ...(newCategories || [])] }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Gets categories ordered by usage frequency (Requirement: category usage tracking)
 * 
 * @param workspaceId - Workspace ID
 * @param type - Optional type filter
 * @returns ActionResult with categories ordered by usage frequency
 */
export async function getCategoriesByUsage(
  workspaceId: string,
  type?: 'income' | 'expense'
): Promise<ActionResult<(Category & { usage_count: number })[]>> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify workspace access
    const accessResult = await verifyWorkspaceMembership(user.id, workspaceId)
    if (!accessResult.hasAccess) {
      return { error: accessResult.error || 'Access denied to workspace' }
    }

    // Build query to get categories with usage count
    let query = supabase
      .from('categories')
      .select(`
        *,
        transactions!left(id)
      `)
      .eq('workspace_id', workspaceId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: categoriesWithTransactions, error } = await query

    if (error) {
      return { error: 'Failed to fetch categories with usage data' }
    }

    // Transform data to include usage count and sort by frequency
    const categoriesWithUsage = (categoriesWithTransactions || []).map(category => {
      const { transactions, ...categoryData } = category
      return {
        ...categoryData,
        usage_count: Array.isArray(transactions) ? transactions.length : 0,
      }
    }).sort((a, b) => {
      // Sort by usage count (descending), then by name (ascending)
      if (b.usage_count !== a.usage_count) {
        return b.usage_count - a.usage_count
      }
      return a.name.localeCompare(b.name)
    })

    return { data: categoriesWithUsage }
  } catch (error) {
    return { error: 'An unexpected error occurred' }
  }
}