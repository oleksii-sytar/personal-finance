/**
 * Property-based tests for form validation
 * Feature: authentication-workspace, Property 3: Form Validation Completeness
 * Validates: Requirements 1.2, 1.7, 2.1, 4.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import fc from 'fast-check'
import { RegisterForm } from '../register-form'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/contexts/auth-context')
vi.mock('next/navigation')

const mockSignUp = vi.fn()
const mockPush = vi.fn()

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: mockSignUp,
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })
  
  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as any)
  
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

/**
 * Helper function to submit form properly
 */
const submitForm = async () => {
  const submitButton = screen.getByRole('button', { name: /create account/i })
  const form = submitButton.closest('form')!
  
  await act(async () => {
    fireEvent.submit(form)
    // Wait a tick for React to process the form submission
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('RegisterForm Property Tests', () => {
  /**
   * Property 3: Form Validation Completeness
   * For any form submission with missing required fields, the system should reject 
   * the submission and provide appropriate error messages
   */
  
  it('Property 3.1: Missing required fields validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fullName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: '' }),
          email: fc.option(fc.emailAddress(), { nil: '' }),
          password: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
          confirmPassword: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: '' }),
        }),
        async ({ fullName, email, password, confirmPassword }) => {
          // Only test cases where at least one field is missing
          const hasEmptyField = !fullName || !email || !password || !confirmPassword
          
          if (!hasEmptyField) return // Skip if all fields are present
          
          cleanup()
          const { unmount } = render(<RegisterForm />)
          
          try {
            // Fill form with potentially empty values
            if (fullName) {
              fireEvent.change(screen.getByLabelText(/full name/i), {
                target: { value: fullName }
              })
            }
            
            if (email) {
              fireEvent.change(screen.getByLabelText(/email address/i), {
                target: { value: email }
              })
            }
            
            if (password) {
              fireEvent.change(screen.getByLabelText(/^password$/i), {
                target: { value: password }
              })
            }
            
            if (confirmPassword) {
              fireEvent.change(screen.getByLabelText(/confirm password/i), {
                target: { value: confirmPassword }
              })
            }
            
            // Submit form using helper
            await submitForm()
            
            // Wait for validation to complete and errors to appear
            await waitFor(() => {
              // Should not call signUp if validation fails
              expect(mockSignUp).not.toHaveBeenCalled()
            }, { timeout: 1000 })
            
            // Check for error messages for empty required fields
            if (!fullName) {
              await waitFor(() => {
                expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
              }, { timeout: 1000 })
            }
            
            if (!email) {
              await waitFor(() => {
                expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
              }, { timeout: 1000 })
            }
            
            if (!password) {
              await waitFor(() => {
                // Empty password triggers the regex validation error, not the length error
                expect(screen.getByText(/password must contain at least one letter and one number/i)).toBeInTheDocument()
              }, { timeout: 1000 })
            }
            
            if (!confirmPassword) {
              await waitFor(() => {
                expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
              }, { timeout: 1000 })
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 2 }
    )
  }, 10000)

  it('Property 3.2: Password validation rules enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          password: fc.oneof(
            fc.string({ minLength: 1, maxLength: 7 }), // Too short
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/\d/.test(s)), // No numbers
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/[A-Za-z]/.test(s)), // No letters
          ),
          fullName: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
        }),
        async ({ password, fullName, email }) => {
          cleanup()
          const { unmount } = render(<RegisterForm />)
          
          try {
            // Fill form with invalid password
            fireEvent.change(screen.getByLabelText(/full name/i), {
              target: { value: fullName }
            })
            fireEvent.change(screen.getByLabelText(/email address/i), {
              target: { value: email }
            })
            fireEvent.change(screen.getByLabelText(/^password$/i), {
              target: { value: password }
            })
            fireEvent.change(screen.getByLabelText(/confirm password/i), {
              target: { value: password }
            })
            
            // Submit form
            await submitForm()
            
            // Wait for validation
            await waitFor(() => {
              expect(mockSignUp).not.toHaveBeenCalled()
            }, { timeout: 1000 })
            
            // Should show password validation error
            await waitFor(() => {
              const passwordError = screen.getByText(/password must contain at least one letter and one number|password must be at least 8 characters/i)
              expect(passwordError).toBeInTheDocument()
            }, { timeout: 1000 })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  it('Property 3.3: Password confirmation mismatch validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          password: fc.string({ minLength: 8, maxLength: 50 })
            .filter(s => /\d/.test(s) && /[A-Za-z]/.test(s)), // Valid password
          confirmPassword: fc.string({ minLength: 8, maxLength: 50 })
            .filter(s => /\d/.test(s) && /[A-Za-z]/.test(s)), // Valid but different
          fullName: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
        }),
        async ({ password, confirmPassword, fullName, email }) => {
          // Only test when passwords don't match
          if (password === confirmPassword) return
          
          cleanup()
          const { unmount } = render(<RegisterForm />)
          
          try {
            // Fill form with mismatched passwords
            fireEvent.change(screen.getByLabelText(/full name/i), {
              target: { value: fullName }
            })
            fireEvent.change(screen.getByLabelText(/email address/i), {
              target: { value: email }
            })
            fireEvent.change(screen.getByLabelText(/^password$/i), {
              target: { value: password }
            })
            fireEvent.change(screen.getByLabelText(/confirm password/i), {
              target: { value: confirmPassword }
            })
            
            // Submit form
            await submitForm()
            
            // Wait for validation
            await waitFor(() => {
              expect(mockSignUp).not.toHaveBeenCalled()
            }, { timeout: 1000 })
            
            // Should show password mismatch error
            await waitFor(() => {
              expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
            }, { timeout: 1000 })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  it('Property 3.4: Valid form submission proceeds', async () => {
    // Use concrete valid data instead of generated data
    const testData = {
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    }
    
    // Mock successful signup
    mockSignUp.mockResolvedValueOnce({
      data: { message: 'Check your email for verification link' }
    })
    
    cleanup()
    const { unmount } = render(<RegisterForm />)
    
    try {
      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: testData.fullName }
      })
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: testData.email }
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: testData.password }
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: testData.password }
      })
      
      // Submit form
      await submitForm()
      
      // Wait for submission
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          fullName: testData.fullName,
          email: testData.email,
          password: testData.password,
          confirmPassword: testData.password,
        })
      }, { timeout: 3000 })
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/check your email for verification link/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    } finally {
      unmount()
    }
  })

  it('Property 3.5: Error clearing on field modification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          newValue: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async ({ newValue }) => {
          cleanup()
          const { unmount } = render(<RegisterForm />)
          
          try {
            // Submit form with empty fields to trigger errors
            await submitForm()
            
            // Wait for validation errors to appear
            await waitFor(() => {
              expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
            }, { timeout: 2000 })
            
            // Start typing in the full name field
            fireEvent.change(screen.getByLabelText(/full name/i), {
              target: { value: newValue }
            })
            
            // Error should be cleared
            await waitFor(() => {
              expect(screen.queryByText(/full name is required/i)).not.toBeInTheDocument()
            }, { timeout: 1000 })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 2 }
    )
  })

  it('Property 3.6: Server error handling', async () => {
    // Use concrete valid data instead of generated data
    const testData = {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password456'
    }
    const errorMessage = 'An account with this email already exists'
    
    // Mock server error
    mockSignUp.mockResolvedValueOnce({
      error: errorMessage
    })
    
    cleanup()
    const { unmount } = render(<RegisterForm />)
    
    try {
      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: testData.fullName }
      })
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: testData.email }
      })
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: testData.password }
      })
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: testData.password }
      })
      
      // Submit form
      await submitForm()
      
      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Should not show success message
      expect(screen.queryByText(/check your email for verification link/i)).not.toBeInTheDocument()
    } finally {
      unmount()
    }
  })
})