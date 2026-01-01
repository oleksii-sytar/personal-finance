'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations/auth'
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
  
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email`
    }
  })
  
  if (error) {
    console.error('Sign up error:', error)
    
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
        console.error('Failed to create user profile:', profileError)
        // Don't fail the signup for this, as the trigger might have worked
      }
    } catch (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't fail the signup for this
    }
  }
  
  return { data: { message: 'Check your email for verification link' } }
  } catch (error) {
    console.error('Supabase connection error:', error)
    
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
    console.error('Sign in error:', error)
    
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
    console.error('Password reset error:', error)
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
export async function verifyEmailAction(token: string): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })
    
    if (error) {
      console.error('Email verification error:', error)
      
      if (error.message.includes('expired')) {
        return { error: 'This verification link has expired. Please request a new one.' }
      }
      
      return { error: 'Invalid or expired verification link.' }
    }
    
    revalidatePath('/', 'layout')
    return { data: { message: 'Your email has been successfully verified!' } }
  } catch (error) {
    console.error('Verification error:', error)
    return { error: 'An error occurred during verification. Please try again.' }
  }
}

/**
 * Server action to resend verification email
 * Requirements: 8.1, 8.2
 */
export async function resendVerificationAction(email: string): Promise<ActionResult<{ message: string }>> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify-email`
      }
    })
    
    if (error) {
      console.error('Resend verification error:', error)
      return { error: 'Failed to resend verification email. Please try again.' }
    }
    
    return { data: { message: 'Verification email sent! Please check your inbox.' } }
  } catch (error) {
    console.error('Resend verification error:', error)
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
      console.error('Sign out error:', error)
    }
  } catch (error) {
    console.error('Sign out error:', error)
  }
  
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}