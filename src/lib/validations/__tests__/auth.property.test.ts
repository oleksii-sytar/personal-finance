/**
 * Property-based tests for password validation
 * Feature: authentication-workspace, Property 1: Password Validation Consistency
 * Validates: Requirements 1.3, 3.7
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { passwordSchema, signUpSchema, passwordResetConfirmSchema } from '../auth'

describe('Password Validation Property Tests', () => {
  /**
   * Property 1: Password Validation Consistency
   * For any password string, the validation rules (minimum 8 characters, at least one number, 
   * one letter) should be consistently applied across registration and password reset flows
   */
  
  it('Property 1.1: Password length requirement consistency', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        (password) => {
          const isValidLength = password.length >= 8
          
          // Test direct password schema
          const directResult = passwordSchema.safeParse(password)
          
          // Test within signup schema
          const signupResult = signUpSchema.safeParse({
            email: 'test@example.com',
            password,
            confirmPassword: password,
            fullName: 'Test User',
          })
          
          // Test within password reset schema
          const resetResult = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password,
            confirmPassword: password,
          })
          
          if (isValidLength && /[A-Za-z]/.test(password) && /\d/.test(password)) {
            // Should be valid in all contexts
            expect(directResult.success).toBe(true)
            expect(signupResult.success).toBe(true)
            expect(resetResult.success).toBe(true)
          } else {
            // Should be invalid in all contexts due to length
            if (!isValidLength) {
              expect(directResult.success).toBe(false)
              expect(signupResult.success).toBe(false)
              expect(resetResult.success).toBe(false)
              
              // Check error messages mention length requirement
              if (!directResult.success) {
                const lengthError = directResult.error.issues.find(
                  issue => issue.message.includes('8 characters')
                )
                expect(lengthError).toBeDefined()
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.2: Letter requirement consistency', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 50 }),
        (password) => {
          const hasLetter = /[A-Za-z]/.test(password)
          const hasNumber = /\d/.test(password)
          
          // Test direct password schema
          const directResult = passwordSchema.safeParse(password)
          
          // Test within signup schema
          const signupResult = signUpSchema.safeParse({
            email: 'test@example.com',
            password,
            confirmPassword: password,
            fullName: 'Test User',
          })
          
          // Test within password reset schema
          const resetResult = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password,
            confirmPassword: password,
          })
          
          if (hasLetter && hasNumber) {
            // Should be valid in all contexts
            expect(directResult.success).toBe(true)
            expect(signupResult.success).toBe(true)
            expect(resetResult.success).toBe(true)
          } else {
            // Should be invalid in all contexts
            expect(directResult.success).toBe(false)
            expect(signupResult.success).toBe(false)
            expect(resetResult.success).toBe(false)
            
            // Check error messages mention letter/number requirement
            if (!directResult.success) {
              const letterNumberError = directResult.error.issues.find(
                issue => issue.message.includes('letter') && issue.message.includes('number')
              )
              expect(letterNumberError).toBeDefined()
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1.3: Number requirement consistency', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 50 }).filter(s => /[A-Za-z]/.test(s)), // Has letters
        (basePassword) => {
          // Create two versions: one with numbers, one without
          const passwordWithNumber = basePassword + '1'
          const passwordWithoutNumber = basePassword.replace(/\d/g, 'a') // Remove all digits
          
          // Test password with number
          const withNumberDirect = passwordSchema.safeParse(passwordWithNumber)
          const withNumberSignup = signUpSchema.safeParse({
            email: 'test@example.com',
            password: passwordWithNumber,
            confirmPassword: passwordWithNumber,
            fullName: 'Test User',
          })
          const withNumberReset = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password: passwordWithNumber,
            confirmPassword: passwordWithNumber,
          })
          
          // Should be valid (has letter and number)
          expect(withNumberDirect.success).toBe(true)
          expect(withNumberSignup.success).toBe(true)
          expect(withNumberReset.success).toBe(true)
          
          // Test password without number (if it actually has no numbers)
          if (!/\d/.test(passwordWithoutNumber)) {
            const withoutNumberDirect = passwordSchema.safeParse(passwordWithoutNumber)
            const withoutNumberSignup = signUpSchema.safeParse({
              email: 'test@example.com',
              password: passwordWithoutNumber,
              confirmPassword: passwordWithoutNumber,
              fullName: 'Test User',
            })
            const withoutNumberReset = passwordResetConfirmSchema.safeParse({
              token: 'valid-token',
              password: passwordWithoutNumber,
              confirmPassword: passwordWithoutNumber,
            })
            
            // Should be invalid (missing number)
            expect(withoutNumberDirect.success).toBe(false)
            expect(withoutNumberSignup.success).toBe(false)
            expect(withoutNumberReset.success).toBe(false)
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 1.4: Valid password acceptance consistency', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          letters: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z]+$/.test(s)),
          numbers: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\d+$/.test(s)),
          extra: fc.string({ minLength: 0, maxLength: 20 }),
        }),
        ({ letters, numbers, extra }) => {
          const password = letters + numbers + extra
          
          // Only test passwords that meet minimum length
          if (password.length < 8) return
          
          // Test direct password schema
          const directResult = passwordSchema.safeParse(password)
          
          // Test within signup schema
          const signupResult = signUpSchema.safeParse({
            email: 'test@example.com',
            password,
            confirmPassword: password,
            fullName: 'Test User',
          })
          
          // Test within password reset schema
          const resetResult = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password,
            confirmPassword: password,
          })
          
          // All should be valid (has letters, numbers, and sufficient length)
          expect(directResult.success).toBe(true)
          expect(signupResult.success).toBe(true)
          expect(resetResult.success).toBe(true)
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 1.5: Error message consistency across contexts', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 7 }), // Too short
          fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/\d/.test(s)), // No numbers
          fc.string({ minLength: 8, maxLength: 50 }).filter(s => !/[A-Za-z]/.test(s)), // No letters
        ),
        (invalidPassword) => {
          // Test direct password schema
          const directResult = passwordSchema.safeParse(invalidPassword)
          
          // Test within signup schema
          const signupResult = signUpSchema.safeParse({
            email: 'test@example.com',
            password: invalidPassword,
            confirmPassword: invalidPassword,
            fullName: 'Test User',
          })
          
          // Test within password reset schema
          const resetResult = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password: invalidPassword,
            confirmPassword: invalidPassword,
          })
          
          // All should be invalid
          expect(directResult.success).toBe(false)
          expect(signupResult.success).toBe(false)
          expect(resetResult.success).toBe(false)
          
          // Extract password-related error messages
          const getPasswordErrors = (result: any) => {
            if (result.success) return []
            return result.error.issues
              .filter((issue: any) => 
                issue.path.length === 0 || 
                issue.path.includes('password')
              )
              .map((issue: any) => issue.message)
          }
          
          const directErrors = getPasswordErrors(directResult)
          const signupErrors = getPasswordErrors(signupResult)
          const resetErrors = getPasswordErrors(resetResult)
          
          // Should have consistent error messages for password validation
          expect(directErrors.length).toBeGreaterThan(0)
          expect(signupErrors.length).toBeGreaterThan(0)
          expect(resetErrors.length).toBeGreaterThan(0)
          
          // The core password error should be the same across contexts
          const directPasswordError = directErrors[0]
          const signupPasswordError = signupErrors.find(err => 
            err.includes('8 characters') || err.includes('letter') || err.includes('number')
          )
          const resetPasswordError = resetErrors.find(err => 
            err.includes('8 characters') || err.includes('letter') || err.includes('number')
          )
          
          expect(signupPasswordError).toBeDefined()
          expect(resetPasswordError).toBeDefined()
          expect(signupPasswordError).toBe(directPasswordError)
          expect(resetPasswordError).toBe(directPasswordError)
        }
      ),
      { numRuns: 30 }
    )
  })

  it('Property 1.6: Special characters handling consistency', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          base: fc.string({ minLength: 6, maxLength: 40 }).filter(s => /[A-Za-z]/.test(s) && /\d/.test(s)),
          special: fc.string({ minLength: 0, maxLength: 10 }).filter(s => /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(s)),
        }),
        ({ base, special }) => {
          const password = base + special
          
          // Only test passwords that meet minimum length
          if (password.length < 8) return
          
          // Test direct password schema
          const directResult = passwordSchema.safeParse(password)
          
          // Test within signup schema
          const signupResult = signUpSchema.safeParse({
            email: 'test@example.com',
            password,
            confirmPassword: password,
            fullName: 'Test User',
          })
          
          // Test within password reset schema
          const resetResult = passwordResetConfirmSchema.safeParse({
            token: 'valid-token',
            password,
            confirmPassword: password,
          })
          
          // Special characters should not affect validation
          // (as long as base requirements are met)
          expect(directResult.success).toBe(true)
          expect(signupResult.success).toBe(true)
          expect(resetResult.success).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })
})