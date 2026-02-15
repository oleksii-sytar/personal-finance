/**
 * Forecast Service
 * 
 * Service layer for fetching data and calculating forecasts with caching.
 * Provides a clean interface for forecast calculations with automatic cache management.
 * 
 * Includes comprehensive monitoring:
 * - Performance tracking for all operations
 * - Error tracking and reporting
 * - Structured logging for debugging
 * - Cache hit/miss metrics
 * 
 * @module services/forecast-service
 */

import { createClient } from '@/lib/supabase/server'
import { calculateDailyForecast, type ForecastResult } from '@/lib/calculations/daily-forecast'
import { assessPaymentRisks, type PaymentRisk } from '@/lib/calculations/payment-risk-assessment'
import type { SpendingTransaction } from '@/lib/calculations/average-daily-spending'
import { logger, trackPerformance, errorTracker } from '@/lib/monitoring'

/**
 * Options for forecast calculation
 */
export interface ForecastOptions {
  /** Start date for forecast (YYYY-MM-DD) */
  startDate: string
  /** End date for forecast (YYYY-MM-DD) */
  endDate: string
  /** Minimum safe balance threshold (optional, uses user settings if not provided) */
  minimumSafeBalance?: number
  /** Number of days to use as safety buffer (default: 7) */
  safetyBufferDays?: number
}

/**
 * Complete forecast data including payment risks
 */
export interface CompleteForecast {
  /** Daily balance forecasts */
  forecast: ForecastResult
  /** Payment risk assessments */
  paymentRisks: PaymentRisk[]
  /** Current account balance */
  currentBalance: number
  /** User settings used in calculation */
  userSettings: {
    minimumSafeBalance: number
    safetyBufferDays: number
  }
}

/**
 * Cache entry with TTL
 */
interface CacheEntry {
  data: CompleteForecast
  timestamp: number
}

/**
 * Forecast Service with caching and monitoring
 * 
 * Provides methods to:
 * - Fetch and calculate forecasts with automatic caching
 * - Invalidate cache when data changes
 * - Handle errors gracefully
 * - Track performance metrics
 * - Monitor error rates
 */
export class ForecastService {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
  private cacheHits = 0
  private cacheMisses = 0
  private totalOperations = 0

  /**
   * Generate cache key for workspace and account
   */
  private getCacheKey(workspaceId: string, accountId: string): string {
    return `${workspaceId}:${accountId}`
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL_MS
  }

  /**
   * Get forecast from cache if valid
   */
  private getFromCache(workspaceId: string, accountId: string): CompleteForecast | null {
    const key = this.getCacheKey(workspaceId, accountId)
    const entry = this.cache.get(key)

    if (entry && this.isCacheValid(entry)) {
      this.cacheHits++
      logger.debug('Cache hit for forecast', {
        workspaceId,
        accountId,
        cacheHitRate: this.getCacheHitRate(),
      })
      return entry.data
    }

    // Remove expired entry
    if (entry) {
      this.cache.delete(key)
      logger.debug('Cache entry expired', { workspaceId, accountId })
    }

    this.cacheMisses++
    logger.debug('Cache miss for forecast', {
      workspaceId,
      accountId,
      cacheHitRate: this.getCacheHitRate(),
    })

    return null
  }

  /**
   * Store forecast in cache
   */
  private setCache(workspaceId: string, accountId: string, data: CompleteForecast): void {
    const key = this.getCacheKey(workspaceId, accountId)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })

    logger.debug('Forecast cached', {
      workspaceId,
      accountId,
      cacheSize: this.cache.size,
      ttlMs: this.CACHE_TTL_MS,
    })
  }

  /**
   * Get cache hit rate as percentage
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses
    return total > 0 ? Math.round((this.cacheHits / total) * 100) : 0
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
      totalOperations: this.totalOperations,
    }
  }

  /**
   * Invalidate cache for specific workspace and account
   * 
   * Call this when transactions change to ensure fresh calculations
   * 
   * @param workspaceId - Workspace ID
   * @param accountId - Account ID
   */
  invalidateCache(workspaceId: string, accountId: string): void {
    const key = this.getCacheKey(workspaceId, accountId)
    const existed = this.cache.has(key)
    this.cache.delete(key)

    if (existed) {
      logger.info('Cache invalidated', { workspaceId, accountId })
    }
  }

  /**
   * Invalidate all cache entries for a workspace
   * 
   * @param workspaceId - Workspace ID
   */
  invalidateWorkspaceCache(workspaceId: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${workspaceId}:`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      logger.info('Workspace cache invalidated', {
        workspaceId,
        entriesCleared: keysToDelete.length,
      })
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    const size = this.cache.size
    this.cache.clear()

    if (size > 0) {
      logger.info('All cache cleared', { entriesCleared: size })
    }
  }

  /**
   * Fetch historical transactions for spending calculation
   */
  private async fetchHistoricalTransactions(
    workspaceId: string,
    accountId: string
  ): Promise<SpendingTransaction[]> {
    return trackPerformance(
      'fetch_historical_transactions',
      async () => {
        const supabase = await createClient()

        // Fetch last 90 days of completed transactions
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const { data, error } = await supabase
          .from('transactions')
          .select('amount, transaction_date, type')
          .eq('workspace_id', workspaceId)
          .eq('account_id', accountId)
          .eq('is_expected', false) // Only completed transactions
          .gte('transaction_date', ninetyDaysAgo.toISOString().split('T')[0])
          .is('deleted_at', null)
          .order('transaction_date', { ascending: true })

        if (error) {
          errorTracker.trackError(
            'data_fetch',
            'fetch_historical_transactions',
            new Error(`Failed to fetch historical transactions: ${error.message}`),
            { workspaceId, accountId }
          )
          throw new Error(`Failed to fetch historical transactions: ${error.message}`)
        }

        const transactions = (data || []).map(t => ({
          amount: t.amount,
          transaction_date: t.transaction_date,
          type: t.type as 'income' | 'expense',
        }))

        logger.debug('Historical transactions fetched', {
          workspaceId,
          accountId,
          count: transactions.length,
        })

        return transactions
      },
      { workspaceId, accountId }
    )
  }

  /**
   * Fetch planned transactions for forecast period
   */
  private async fetchPlannedTransactions(
    workspaceId: string,
    accountId: string,
    startDate: string,
    endDate: string
  ) {
    return trackPerformance(
      'fetch_planned_transactions',
      async () => {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('transactions')
          .select('amount, transaction_date, type')
          .eq('workspace_id', workspaceId)
          .eq('account_id', accountId)
          .eq('is_expected', true) // Only planned transactions
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .is('deleted_at', null)
          .order('transaction_date', { ascending: true })

        if (error) {
          errorTracker.trackError(
            'data_fetch',
            'fetch_planned_transactions',
            new Error(`Failed to fetch planned transactions: ${error.message}`),
            { workspaceId, accountId, startDate, endDate }
          )
          throw new Error(`Failed to fetch planned transactions: ${error.message}`)
        }

        const transactions = (data || []).map(t => ({
          amount: t.amount,
          planned_date: t.transaction_date,
          type: t.type as 'income' | 'expense',
        }))

        logger.debug('Planned transactions fetched', {
          workspaceId,
          accountId,
          count: transactions.length,
          dateRange: { startDate, endDate },
        })

        return transactions
      },
      { workspaceId, accountId, startDate, endDate }
    )
  }

  /**
   * Fetch user settings for forecast calculation
   */
  private async fetchUserSettings(workspaceId: string) {
    return trackPerformance(
      'fetch_user_settings',
      async () => {
        const supabase = await createClient()

        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
          const error = new Error('User not authenticated')
          errorTracker.trackError('data_fetch', 'fetch_user_settings', error, { workspaceId })
          throw error
        }

        const { data, error } = await supabase
          .from('user_settings')
          .select('minimum_safe_balance, safety_buffer_days')
          .eq('user_id', user.user.id)
          .eq('workspace_id', workspaceId)
          .single()

        if (error) {
          // Return defaults if settings don't exist
          logger.debug('User settings not found, using defaults', { workspaceId })
          return {
            minimumSafeBalance: 1000,
            safetyBufferDays: 7,
          }
        }

        const settings = {
          minimumSafeBalance: data.minimum_safe_balance || 1000,
          safetyBufferDays: data.safety_buffer_days || 7,
        }

        logger.debug('User settings fetched', { workspaceId, settings })

        return settings
      },
      { workspaceId }
    )
  }

  /**
   * Fetch current account balance
   */
  private async fetchCurrentBalance(
    workspaceId: string,
    accountId: string
  ): Promise<number> {
    return trackPerformance(
      'fetch_current_balance',
      async () => {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('account_actual_balances')
          .select('actual_balance')
          .eq('workspace_id', workspaceId)
          .eq('account_id', accountId)
          .single()

        if (error) {
          errorTracker.trackError(
            'data_fetch',
            'fetch_current_balance',
            new Error(`Failed to fetch current balance: ${error.message}`),
            { workspaceId, accountId }
          )
          throw new Error(`Failed to fetch current balance: ${error.message}`)
        }

        const balance = data?.actual_balance || 0

        logger.debug('Current balance fetched', { workspaceId, accountId, balance })

        return balance
      },
      { workspaceId, accountId }
    )
  }

  /**
   * Get forecast for workspace and account
   * 
   * This method:
   * - Checks cache first (5-minute TTL)
   * - Fetches all required data from database
   * - Calculates daily forecast and payment risks
   * - Caches result for future requests
   * 
   * @param workspaceId - Workspace ID
   * @param accountId - Account ID
   * @param options - Forecast options (date range, settings overrides)
   * @returns Complete forecast with payment risks
   * 
   * @throws Error if data fetching fails
   * 
   * @example
   * ```typescript
   * const service = new ForecastService()
   * const forecast = await service.getForecast(
   *   'workspace-id',
   *   'account-id',
   *   {
   *     startDate: '2026-02-01',
   *     endDate: '2026-02-28'
   *   }
   * )
   * 
   * if (forecast.forecast.shouldDisplay) {
   *   console.log('Daily forecasts:', forecast.forecast.forecasts)
   *   console.log('Payment risks:', forecast.paymentRisks)
   * }
   * ```
   */
  async getForecast(
    workspaceId: string,
    accountId: string,
    options: ForecastOptions
  ): Promise<CompleteForecast> {
    this.totalOperations++

    return trackPerformance(
      'get_forecast',
      async () => {
        // Check cache first
        const cached = this.getFromCache(workspaceId, accountId)
        if (cached) {
          logger.info('Forecast served from cache', {
            workspaceId,
            accountId,
            cacheStats: this.getCacheStats(),
          })
          return cached
        }

        logger.info('Calculating new forecast', {
          workspaceId,
          accountId,
          dateRange: { startDate: options.startDate, endDate: options.endDate },
        })

        try {
          // Fetch all required data in parallel
          const [
            historicalTransactions,
            plannedTransactions,
            userSettings,
            currentBalance,
          ] = await Promise.all([
            this.fetchHistoricalTransactions(workspaceId, accountId),
            this.fetchPlannedTransactions(
              workspaceId,
              accountId,
              options.startDate,
              options.endDate
            ),
            this.fetchUserSettings(workspaceId),
            this.fetchCurrentBalance(workspaceId, accountId),
          ])

          // Use provided settings or fall back to user settings
          const finalSettings = {
            minimumSafeBalance: options.minimumSafeBalance ?? userSettings.minimumSafeBalance,
            safetyBufferDays: options.safetyBufferDays ?? userSettings.safetyBufferDays,
          }

          logger.debug('Data fetched for forecast', {
            workspaceId,
            accountId,
            historicalCount: historicalTransactions.length,
            plannedCount: plannedTransactions.length,
            currentBalance,
            settings: finalSettings,
          })

          // Calculate daily forecast
          const forecast = calculateDailyForecast(
            currentBalance,
            historicalTransactions,
            plannedTransactions,
            options.startDate,
            options.endDate,
            finalSettings
          )

          logger.info('Forecast calculated', {
            workspaceId,
            accountId,
            shouldDisplay: forecast.shouldDisplay,
            confidence: forecast.spendingConfidence,
            averageDailySpending: forecast.averageDailySpending,
            forecastDays: forecast.forecasts.length,
            safeDays: forecast.forecasts.filter(f => f.riskLevel === 'safe').length,
            warningDays: forecast.forecasts.filter(f => f.riskLevel === 'warning').length,
            dangerDays: forecast.forecasts.filter(f => f.riskLevel === 'danger').length,
          })

          // Calculate payment risks if forecast should be displayed
          let paymentRisks: PaymentRisk[] = []
          if (forecast.shouldDisplay && forecast.forecasts.length > 0) {
            // Convert planned transactions to format expected by payment risk assessment
            const plannedForRisk = plannedTransactions.map(t => ({
              id: `planned-${t.planned_date}`,
              amount: t.amount,
              description: 'Planned transaction',
              type: t.type as 'income' | 'expense' | 'transfer_in' | 'transfer_out',
              status: 'planned' as const,
              transaction_date: new Date(t.planned_date),
              planned_date: new Date(t.planned_date),
            }))

            // Convert forecasts to format expected by payment risk assessment
            const forecastsForRisk = forecast.forecasts.map(f => ({
              date: new Date(f.date),
              projectedBalance: f.projectedBalance,
              confidence: f.confidence,
              riskLevel: f.riskLevel,
              breakdown: f.breakdown,
              warnings: [],
            }))

            paymentRisks = assessPaymentRisks(
              plannedForRisk,
              forecastsForRisk,
              forecast.averageDailySpending,
              finalSettings.safetyBufferDays
            )

            logger.info('Payment risks assessed', {
              workspaceId,
              accountId,
              totalRisks: paymentRisks.length,
              dangerRisks: paymentRisks.filter(r => r.riskLevel === 'danger').length,
              warningRisks: paymentRisks.filter(r => r.riskLevel === 'warning').length,
              safeRisks: paymentRisks.filter(r => r.riskLevel === 'safe').length,
            })
          }

          // Build complete forecast
          const completeForecast: CompleteForecast = {
            forecast,
            paymentRisks,
            currentBalance,
            userSettings: finalSettings,
          }

          // Cache result
          this.setCache(workspaceId, accountId, completeForecast)

          logger.info('Forecast completed successfully', {
            workspaceId,
            accountId,
            cacheStats: this.getCacheStats(),
          })

          return completeForecast
        } catch (error) {
          // Track error
          errorTracker.trackError(
            'calculation',
            'get_forecast',
            error instanceof Error ? error : new Error(String(error)),
            { workspaceId, accountId, options }
          )

          // Re-throw with more context
          if (error instanceof Error) {
            throw new Error(`Forecast calculation failed: ${error.message}`)
          }
          throw new Error('Forecast calculation failed: Unknown error')
        }
      },
      { workspaceId, accountId, totalOperations: this.totalOperations }
    )
  }
}

// Export singleton instance
export const forecastService = new ForecastService()
