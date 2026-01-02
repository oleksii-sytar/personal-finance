'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations/auth'
import { logAuthFailure, logError } from '@/lib/utils/error-logging'
import type { ActionResult } from '@/types/actions'

/**
 * Server action for user registration
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.7
 */
export async function signUpAction(formData: FormData): Promise<ActionResult<{ message: string }>> {
  try {
    const supabase = await createClient()
    
    const validated = signUpSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      fullName: formData.get('fullName')
    })
    
    if (!validated.success) {
      return { error: validated.error.flatten() }
    }

    // Get invitation token if provided
    const inviteToken = formData.get('inviteToken') as string | null
    
    // Build redirect URL with invitation token if present
    let redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email`
    if (inviteToken) {
      redirectUrl += `?token=${inviteToken}`
    }
  
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
        // Store invitation token in user metadata for later retrieval
        invite_token: inviteToken || null
      },
      emailRedirectTo: redirectUrl
    }
  })
  
  if (error) {
    // Log authentication failure (Requirement 9.4, 9.5)
    logAuthFailure('signup', {
      email: validated.data.email,
      reason: error.message
    })
    
    // Handle specific error cases (Requirement 1.7)
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists' }
    }
    
    return { error: error.message }
  }

  // Workaround: Manually create user profile if trigger failed
  if (data.user) {
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          full_name: validated.data.fullName
        })
      
      if (profileError && !profileError.message.includes('duplicate key')) {
        // Don't fail the signup for this, as the trigger might have worked
      }
    } catch (profileError) {
      // Don't fail the signup for this
    }
  }
  
  return { data: { message: 'Check your email for verification link' } }
  } catch (error) {
    // Log system error (Requirement 9.4, 9.5)
    logError(error instanceof Error ? error : new Error(String(error)), {
      category: 'auth',
      additionalContext: { action: 'signup' }
    })
    
    // Handle Supabase connection issues gracefully
    if (error instanceof Error && error.message.includes('fetch')) {
      return { 
        error: 'Database connection unavailable. Please ensure Supabase is running locally or check your connection.' 
      }
    }
    
    return { error: 'An unexpected error occurred during signup. Please try again.' }
  }
}

/**
 * Server action for user sign in
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */
export async function signInAction(formData: FormData): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient()
  
  const validated = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    rememberMe: formData.get('rememberMe') === 'on'
  })
  
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })
  
  if (error) {
    // Log authentication failure (Requirement 9.4, 9.5)
    logAuthFailure('login', {
      email: validated.data.email,
      reason: error.message
    })
    
    // Return generic error message for security (Requirement 2.3)
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please verify your email before signing in' }
    }
    
    return { error: 'Invalid email or password' }
  }
  
  // Check if email is verified (Requirement 1.6, 8.5)
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    return { error: 'Please verify your email before signing in' }
  }
  
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Server action for password reset request
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export async function resetPasswordAction(formData: FormData): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient()
  
  const validated = resetPasswordSchema.safeParse({
    email: formData.get('email')
  })
  
  if (!validated.success) {
    return { error: validated.error.flatten() }
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password/confirm`
  })
  
  if (error) {
    // Password reset errors are handled silently for security
  }
  
  // Always return success message for security (Requirement 3.4)
  return { 
    data: { 
      message: 'If an account with that email exists, you will receive a password reset link.' 
    } 
  }
}

/**
 * Server action for email verification
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export async function verifyEmailAction(token: string): Promise<ActionResult<{ message: string; inviteToken?: string }>> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })
    
    if (error) {
      // Email verification errors are handled silently
      
      if (error.message.includes('expired')) {
        return { error: 'This verification link has expired. Please request a new one.' }
      }
      
      return { error: 'Invalid or expired verification link.' }
    }
    
    // Check if user has an invitation token in their metadata
    const user = data.user
    const inviteToken = user?.user_metadata?.invite_token
    
    if (inviteToken) {
      console.log('User has invitation token, attempting to accept invitation:', inviteToken)
      
      try {
        // Import and call the invitation acceptance function
        const { acceptInvitation } = await import('@/actions/invitation')
        const inviteResult = await acceptInvitation(inviteToken)
        
        if (inviteResult.success) {
          console.log('Invitation accepted successfully')
          revalidatePath('/', 'layout')
          return { 
            data: { 
              message: 'Your email has been verified and you have been added to the workspace!',
              inviteToken 
            } 
          }
        } else {
          console.log('Failed to accept invitation:', inviteResult.error)
          // Don't fail email verification if invitation acceptance fails
          revalidatePath('/', 'layout')
          return { 
            data: { 
              message: 'Your email has been verified! Please check your invitation link.',
              inviteToken 
            } 
          }
        }
      } catch (inviteError) {
        console.error('Error accepting invitation:', inviteError)
        // Don't fail email verification if invitation acceptance fails
        revalidatePath('/', 'layout')
        return { 
          data: { 
            message: 'Your email has been verified! Please check your invitation link.',
            inviteToken 
          } 
        }
      }
    }
    
    revalidatePath('/', 'layout')
    return { data: { message: 'Your email has been successfully verified!' } }
  } catch (error) {
    return { error: 'An error occurred during verification. Please try again.' }
  }
}

/**
 * Server action to resend verification email
 * Requirements: 8.1, 8.2
 */
export async function resendVerificationAction(email: string, inviteToken?: string): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient()
  
  try {
    // Build redirect URL with invitation token if present
    let redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email`
    if (inviteToken) {
      redirectUrl += `?token=${inviteToken}`
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      return { error: 'Failed to resend verification email. Please try again.' }
    }
    
    return { data: { message: 'Verification email sent! Please check your inbox.' } }
  } catch (error) {
    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Server action for user sign out
 * Requirements: 7.1, 7.2, 7.3
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      // Sign out errors are handled silently
    }
  } catch (error) {
    // Sign out errors are handled silently
  }
  
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}