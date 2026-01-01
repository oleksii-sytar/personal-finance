'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Ensure user profile exists for the current user
 * This should be called when a user first accesses the app
 */
export async function ensureUserProfile() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return { data: existingProfile }
    }

    // Create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      return { error: createError.message }
    }

    revalidatePath('/settings')
    return { data: newProfile }
  } catch (error) {
    console.error('Error ensuring user profile:', error)
    return { error: 'Failed to create user profile' }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const fullName = formData.get('full_name') as string

  if (!fullName || fullName.trim().length === 0) {
    return { error: 'Full name is required' }
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName.trim()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return { error: error.message }
    }

    revalidatePath('/settings')
    return { data }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return { error: 'Failed to update user profile' }
  }
}