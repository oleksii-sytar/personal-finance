/**
 * Cryptographic utilities for authentication and workspace features
 * Following security requirements from the design document
 */

/**
 * Generate a cryptographically secure random token
 * Used for password reset links, email verification, and workspace invitations
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues for cryptographically secure randomness
  const randomArray = new Uint8Array(length)
  crypto.getRandomValues(randomArray)
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomArray[i] % chars.length)
  }
  
  return result
}

/**
 * Generate a secure invitation token
 * 32 characters, URL-safe
 */
export function generateInvitationToken(): string {
  return generateSecureToken(32)
}

/**
 * Generate a secure password reset token
 * 48 characters for extra security
 */
export function generatePasswordResetToken(): string {
  return generateSecureToken(48)
}

/**
 * Generate a secure email verification token
 * 24 characters, sufficient for email verification
 */
export function generateEmailVerificationToken(): string {
  return generateSecureToken(24)
}

/**
 * Create expiration date for tokens
 */
export function createTokenExpiration(hours: number): Date {
  const expiration = new Date()
  expiration.setHours(expiration.getHours() + hours)
  return expiration
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expiration < new Date()
}