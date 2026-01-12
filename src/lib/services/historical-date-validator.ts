import type { SupabaseClient } from '@supabase/supabase-js'

export interface DateValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  recommendations: string[]
}

export interface TransactionCoverage {
  percentage: number
  totalTransactions: number
  periodDays: number
  averageTransactionsPerDay: number
}

/**
 * HistoricalDateValidator service for validating checkpoint dates
 * Implements Requirements: 1.4 - Historical date validation with business rules
 */
export class HistoricalDateValidator {
  /**
   * Validates a historical date for checkpoint creation
   * @param date - The date to validate
   * @param workspaceId - The workspace ID
   * @param supabase - Supabase client
   * @returns Validation result with errors, warnings, and recommendations
   */
  static async validateHistoricalDate(
    date: Date,
    workspaceId: string,
    supabase: SupabaseClient
  ): Promise<DateValidationResult> {
    const result: DateValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    }

    // Check if date is in the future
    if (date > new Date()) {
      result.isValid = false
      result.errors.push('Cannot create checkpoint for future date')
      return result
    }

    // Check if date is too far in the past (more than 2 years)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    
    if (date < twoYearsAgo) {
      result.warnings.push('Creating checkpoint more than 2 years in the past may affect accuracy')
      result.recommendations.push('Consider starting with a more recent date for better transaction coverage')
    }

    // Check for existing checkpoints after this date
    try {
      const laterCheckpoints = await this.getCheckpointsAfterDate(date, workspaceId, supabase)
      if (laterCheckpoints.length > 0) {
        result.isValid = false
        result.errors.push(
          `Cannot create checkpoint before existing checkpoint on ${laterCheckpoints[0].created_at.toLocaleDateString()}`
        )
        return result
      }
    } catch (error) {
      console.error('Error checking existing checkpoints:', error)
      result.warnings.push('Unable to verify existing checkpoints - please check manually')
    }

    // Check transaction coverage for the period
    try {
      const transactionCoverage = await this.analyzeTransactionCoverage(date, workspaceId, supabase)
      if (transactionCoverage.percentage < 0.8) {
        result.warnings.push(
          `Limited transaction data available (${Math.round(transactionCoverage.percentage * 100)}% coverage)`
        )
        result.recommendations.push('Consider adding missing transactions for the period to improve accuracy')
      }

      // If very few transactions, suggest this might not be the best starting point
      if (transactionCoverage.totalTransactions < 5) {
        result.warnings.push('Very few transactions found for this period')
        result.recommendations.push('Consider selecting a date with more transaction activity')
      }
    } catch (error) {
      console.error('Error analyzing transaction coverage:', error)
      result.warnings.push('Unable to analyze transaction coverage for this period')
    }

    return result
  }

  /**
   * Gets checkpoints created after the specified date
   * @param date - The reference date
   * @param workspaceId - The workspace ID
   * @param supabase - Supabase client
   * @returns Array of checkpoints after the date
   */
  private static async getCheckpointsAfterDate(
    date: Date,
    workspaceId: string,
    supabase: SupabaseClient
  ): Promise<Array<{ created_at: Date }>> {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .gt('created_at', date.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to check existing checkpoints: ${error.message}`)
    }

    return (data || []).map(row => ({
      created_at: new Date(row.created_at)
    }))
  }

  /**
   * Analyzes transaction coverage for a historical period
   * @param date - The checkpoint date
   * @param workspaceId - The workspace ID
   * @param supabase - Supabase client
   * @returns Transaction coverage analysis
   */
  private static async analyzeTransactionCoverage(
    date: Date,
    workspaceId: string,
    supabase: SupabaseClient
  ): Promise<TransactionCoverage> {
    // Calculate period start (30 days before the checkpoint date)
    const periodStart = new Date(date)
    periodStart.setDate(periodStart.getDate() - 30)

    // Get transactions in the period
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, transaction_date, amount')
      .eq('workspace_id', workspaceId)
      .gte('transaction_date', periodStart.toISOString())
      .lte('transaction_date', date.toISOString())
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to analyze transaction coverage: ${error.message}`)
    }

    const totalTransactions = transactions?.length || 0
    const periodDays = Math.ceil((date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
    const averageTransactionsPerDay = totalTransactions / periodDays

    // Calculate coverage percentage based on expected transaction frequency
    // Assume healthy financial activity has at least 1 transaction every 3 days
    const expectedTransactions = periodDays / 3
    const percentage = Math.min(totalTransactions / expectedTransactions, 1)

    return {
      percentage,
      totalTransactions,
      periodDays,
      averageTransactionsPerDay
    }
  }

  /**
   * Validates that a date is suitable for establishing a baseline checkpoint
   * @param date - The proposed baseline date
   * @param workspaceId - The workspace ID
   * @param supabase - Supabase client
   * @returns Whether the date is suitable for a baseline
   */
  static async validateBaselineDate(
    date: Date,
    workspaceId: string,
    supabase: SupabaseClient
  ): Promise<{ isValid: boolean; reason?: string }> {
    // Check if this would be the first checkpoint
    const { data: existingCheckpoints, error } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)

    if (error) {
      return { isValid: false, reason: 'Unable to check existing checkpoints' }
    }

    const isFirstCheckpoint = !existingCheckpoints || existingCheckpoints.length === 0

    if (isFirstCheckpoint) {
      // For first checkpoint, allow more flexibility with historical dates
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      if (date < oneYearAgo) {
        return { 
          isValid: false, 
          reason: 'First checkpoint should not be more than 1 year in the past' 
        }
      }
    }

    return { isValid: true }
  }
}