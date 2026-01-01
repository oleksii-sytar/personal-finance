'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/category'
import type { ActionResult, Category } from '@/types'

/**
 * Creates a new category following code-quality.md patterns
 * 
 * @param formData - Form data containing category details
 * @returns ActionResult with created category or error
 */
export async function createCategory(
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
    const validated = createCategorySchema.safeParse(rawData)

    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!workspace) {
      return { error: 'No workspace found' }
    }

    // Create category
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...validated.data,
        workspace_id: workspace.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Category creation error:', error)
      return { error: 'Failed to create category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: category }
  } catch (error) {
    console.error('Unexpected error in createCategory:', error)
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

    // Update category (RLS will ensure user can only update their own)
    const { data: category, error } = await supabase
      .from('categories')
      .update(validated.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Category update error:', error)
      return { error: 'Failed to update category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: category }
  } catch (error) {
    console.error('Unexpected error in updateCategory:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Deletes a category
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

    // Check if category is in use
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (transactions && transactions.length > 0) {
      return { error: 'Cannot delete category that is in use by transactions' }
    }

    // Delete category (RLS will ensure user can only delete their own)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Category deletion error:', error)
      return { error: 'Failed to delete category' }
    }

    revalidatePath('/categories')
    revalidatePath('/transactions')
    
    return { data: { id } }
  } catch (error) {
    console.error('Unexpected error in deleteCategory:', error)
    return { error: 'An unexpected error occurred' }
  }
}