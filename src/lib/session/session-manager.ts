/**
 * SessionManager for transparent session handling
 * Separates session validation from navigation logic
 * Requirements: 5.1, 5.2, 5.5
 */

import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface SessionState {
  user: User | null
  session: Session | null
  lastValidated: Date | null
  isValid: boolean
}

/**
 * Manages session state without triggering navigation
 * Requirements: 5.1, 5.2, 5.5
 */
export class SessionManager {
  private state: SessionState = {
    user: null,
    session: null,
    lastValidated: null,
    isValid: false
  }

  private supabase = createClient()

  /**
   * Validates session without changing the current page location
   * Requirements: 5.1, 5.2
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      this.state = {
        user: session?.user ?? null,
        session,
        lastValidated: new Date(),
        isValid: !!session && !error
      }
      
      return this.state.isValid
    } catch (error) {
      console.error('Session validation error:', error)
      this.state = {
        user: null,
        session: null,
        lastValidated: new Date(),
        isValid: false
      }
      return false
    }
  }

  /**
   * Gets current session state without side effects
   * Requirements: 5.1, 5.5
   */
  getState(): SessionState {
    return { ...this.state }
  }

  /**
   * Checks if session is valid without triggering validation
   * Requirements: 5.1, 5.5
   */
  isSessionValid(): boolean {
    return this.state.isValid
  }

  /**
   * Gets current user without side effects
   * Requirements: 5.1, 5.5
   */
  getCurrentUser(): User | null {
    return this.state.user
  }

  /**
   * Gets current session without side effects
   * Requirements: 5.1, 5.5
   */
  getCurrentSession(): Session | null {
    return this.state.session
  }

  /**
   * Checks if session validation is recent (within last 5 minutes)
   * Requirements: 5.2, 5.5
   */
  isValidationRecent(): boolean {
    if (!this.state.lastValidated) return false
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return this.state.lastValidated > fiveMinutesAgo
  }

  /**
   * Refreshes session if needed without navigation side effects
   * Requirements: 5.1, 5.2, 5.5
   */
  async refreshSessionIfNeeded(): Promise<boolean> {
    // Only refresh if validation is not recent
    if (this.isValidationRecent()) {
      return this.state.isValid
    }

    return await this.validateSession()
  }

  /**
   * Clears session state without navigation
   * Requirements: 5.1, 5.5
   */
  clearSession(): void {
    this.state = {
      user: null,
      session: null,
      lastValidated: new Date(),
      isValid: false
    }
  }
}

// Export singleton instance for consistent state management
export const sessionManager = new SessionManager()