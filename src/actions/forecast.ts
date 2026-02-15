/**
 * Forecast Server Actions
 * 
 * Server actions for fetching and calculating financial forecasts.
 * Provides secure access to forecast data with proper authentication and authorization.
 * 
 * @module actions/forecast
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { forecastService, type ForecastOptions } from '@/lib/services/forecast-service'
import type { DailyForecast } from '@/lib/calculations/daily-forecast'
import type { PaymentRisk } from '@/lib/calculations/payment-risk-assessment'

/**
 * Result returned from getForecast action
 */
export interface ForecastResult {
  /** Daily balance forecasts */
  dailyForecasts: DailyForecast[]
  /** Payment risk assessments */
  paymentRisks: PaymentRisk[]
  /** Average daily spending used in calculation */
  averageDailySpending: number
  /** Confidence level of spending calculation */
  spendingConfidence: 'high' | 'medium' | 'low' | 'none'
  /** Current account balance */
  currentBalance: number
  /** User settings used in calculation */
  userSettings: {
    minimumSafeBalance: number
    safetyBufferDays: number
  }
  /** Metadata about the calculation */
  metadata: {
    calculatedAt: Date
    shouldDisplay: boolean
  }
}

/**
 * Action result wrapper
 */
export type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string }

/**
 * Get forecast for workspace and account
 * 
 * This action:
 * - Verifies user authentication
 * - Checks workspace membership (access control)
 * - Fetches user settings for thresholds
 * - Calls forecast calculation engine
 * - Returns formatted results with error handling
 * 
 * @param workspaceId - Workspace ID to get forecast for
 * @param accountId - Account ID to get forecast for
 * @param month - Month to forecast (Date object)
 * @returns Forecast result or error
 * 
 * @example
 * ```typescript
 * const result = await getForecast(
 *   'workspace-id',
 *   'account-id',
 *   new Date('2026-02-01')
 * )
 * 
 * if (result.error) {
 *   console.error(result.error)
 * } else {
 *   console.log('Forecast:', result.data.dailyForecasts)
 * }
 * ```
 */
export async function getForecast(
  workspaceId: string,
  accountId: string,
  month: Date
): Promise<ActionResult<ForecastResult>> {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Unauthorized - please log in' }
    }
    
    // 2. Verify workspace membership (access control)
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !member) {
      return { error: 'Access denied - you do not have access to this workspace' }
    }
    
    // 3. Verify account belongs to workspace
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, workspace_id')
      .eq('id', accountId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single()
    
    if (accountError || !account) {
      return { error: 'Account not found or does not belong to this workspace' }
    }
    
    // 4. Calculate date range for the month
    // Use UTC to avoid timezone issues
    const startDate = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1))
    const endDate = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0))
    
    // Format dates as YYYY-MM-DD
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    // 5. Prepare forecast options
    const options: ForecastOptions = {
      startDate: startDateStr,
      endDate: endDateStr,
      // User settings will be fetched by forecastService
    }
    
    // 6. Call forecast calculation engine
    const completeForecast = await forecastService.getForecast(
      workspaceId,
      accountId,
      options
    )
    
    // 7. Format and return results
    const result: ForecastResult = {
      dailyForecasts: completeForecast.forecast.forecasts,
      paymentRisks: completeForecast.paymentRisks,
      averageDailySpending: completeForecast.forecast.averageDailySpending,
      spendingConfidence: completeForecast.forecast.spendingConfidence,
      currentBalance: completeForecast.currentBalance,
      userSettings: completeForecast.userSettings,
      metadata: {
        calculatedAt: new Date(),
        shouldDisplay: completeForecast.forecast.shouldDisplay,
      },
    }
    
    return { data: result }
    
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Forecast calculation error:', error)
    
    // Return user-friendly error message
    if (error instanceof Error) {
      return { error: `Failed to calculate forecast: ${error.message}` }
    }
    
    return { error: 'An unexpected error occurred while calculating forecast' }
  }
}

/**
 * Invalidate forecast cache for a workspace and account
 * 
 * Call this action when transactions are added, updated, or deleted
 * to ensure fresh forecast calculations.
 * 
 * @param workspaceId - Workspace ID
 * @param accountId - Account ID
 * @returns Success or error
 * 
 * @example
 * ```typescript
 * // After creating a transaction
 * await invalidateForecastCache(workspaceId, accountId)
 * ```
 */
export async function invalidateForecastCache(
  workspaceId: string,
  accountId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    // Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }
    
    // Verify workspace membership
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !member) {
      return { error: 'Access denied' }
    }
    
    // Invalidate cache
    forecastService.invalidateCache(workspaceId, accountId)
    
    return { data: { success: true } }
    
  } catch (error) {
    console.error('Cache invalidation error:', error)
    return { error: 'Failed to invalidate cache' }
  }
}

/**
 * Invalidate all forecast caches for a workspace
 * 
 * Call this when workspace-level changes occur that affect all accounts.
 * 
 * @param workspaceId - Workspace ID
 * @returns Success or error
 */
export async function invalidateWorkspaceForecastCache(
  workspaceId: string
): Promise<ActionResult<{ success: true }>> {
  try {
    // Verify user authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { error: 'Unauthorized' }
    }
    
    // Verify workspace membership
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !member) {
      return { error: 'Access denied' }
    }
    
    // Invalidate all caches for workspace
    forecastService.invalidateWorkspaceCache(workspaceId)
    
    return { data: { success: true } }
    
  } catch (error) {
    console.error('Workspace cache invalidation error:', error)
    return { error: 'Failed to invalidate workspace cache' }
  }
}
