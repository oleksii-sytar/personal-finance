'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { userSettingsFormSchema, type UserSettingsFormInput } from '@/lib/validations/user-settings'

/**
 * User Settings Server Actions
 * Requirements: User Journey Enhancement - Phase 2: Financial Safety Dashboard
 * 
 * Handles CRUD operations for user-specific forecast preferences
 */

export interface UserSettings {
  id: string
  user_id: string
  workspace_id: string
  minimum_safe_balance: number
  safety_buffer_days: number
  created_at: string
  updated_at: string
}

export type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

/**
 * Get user settings for current workspace
 */
export async function getUserSettings(
  workspaceId: string
): Promise<ActionResult<UserSettings | null>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { error: 'Access denied' }
    }

    // Get user settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (error) {
      // If no settings exist yet, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null }
      }
      console.error('Error fetching user settings:', error)
      return { error: 'Failed to fetch settings' }
    }

    return { data }
  } catch (error) {
    console.error('Unexpected error fetching user settings:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Update or create user settings
 */
export async function updateUserSettings(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<UserSettings>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { error: 'Access denied' }
    }

    // Parse and validate form data
    const rawData = {
      minimum_safe_balance: formData.get('minimum_safe_balance'),
      safety_buffer_days: formData.get('safety_buffer_days'),
    }

    const validated = userSettingsFormSchema.safeParse(rawData)

    if (!validated.success) {
      const fieldErrors: Record<string, string[]> = {}
      validated.error.errors.forEach((error) => {
        if (error.path[0]) {
          const field = error.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = []
          }
          fieldErrors[field].push(error.message)
        }
      })
      return { error: fieldErrors }
    }

    // Upsert user settings (insert or update)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        workspace_id: workspaceId,
        minimum_safe_balance: validated.data.minimum_safe_balance,
        safety_buffer_days: validated.data.safety_buffer_days,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,workspace_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating user settings:', error)
      return { error: 'Failed to save settings' }
    }

    // Revalidate paths that use forecast data
    revalidatePath('/dashboard')
    revalidatePath('/transactions')

    return { data }
  } catch (error) {
    console.error('Unexpected error updating user settings:', error)
    return { error: 'An unexpected error occurred' }
  }
}
