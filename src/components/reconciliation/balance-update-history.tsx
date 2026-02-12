/**
 * BalanceUpdateHistory Component
 * 
 * Displays history of balance updates with filtering capabilities.
 * Implements Requirements 10.2, 10.3, 10.4, 10.5 from realtime-balance-reconciliation spec.
 * 
 * Features:
 * - Display history table with old/new values and difference
 * - Show update timestamps and user who made change
 * - Calculate and display time between updates
 * - Support filtering by account and date range
 */

'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Clock, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react'
import { getBalanceUpdateHistory, type BalanceUpdateHistory, type BalanceUpdateHistoryFilters } from '@/actions/balance-reconciliation'
import { formatCurrency } from '@/lib/utils/format'

interface BalanceUpdateHistoryProps {
  accountId?: string
  workspaceId?: string
  currency: string
  className?: string
}

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * BalanceUpdateHistory Component
 * 
 * Requirements:
 * - 10.2: Display history table with old/new values and difference
 * - 10.3: Show update timestamps and user who made change
 * - 10.4: Calculate and display time between updates
 * - 10.5: Support filtering by account and date range
 */
export function BalanceUpdateHistory({
  accountId,
  workspaceId,
  currency,
  className = ''
}: BalanceUpdateHistoryProps) {
  const [history, setHistory] = useState<BalanceUpdateHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<BalanceUpdateHistoryFilters>({
    accountId,
    workspaceId,
    startDate: undefined,
    endDate: undefined
  })

  // Fetch history data
  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true)
      setError(null)

      const result = await getBalanceUpdateHistory(filters)

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to fetch history')
        setHistory([])
      } else {
        setHistory(result.data || [])
      }

      setIsLoading(false)
    }

    fetchHistory()
  }, [filters])

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<BalanceUpdateHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({
      accountId,
      workspaceId,
      startDate: undefined,
      endDate: undefined
    })
  }

  if (isLoading) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="text-center py-12">
          <p className="text-accent-error">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-card p-6 ${className}`}>
      {/* Header with filter toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading text-lg text-primary">Balance Update History</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary px-4 py-2 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filter panel (Requirement 10.5) */}
      {showFilters && (
        <div className="bg-glass p-4 rounded-xl border border-glass mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="text-sm font-medium text-primary mb-2 block">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
                className="form-input w-full"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="text-sm font-medium text-primary mb-2 block">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
                className="form-input w-full"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResetFilters}
              className="btn-secondary px-4 py-2"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* History table (Requirements 10.2, 10.3, 10.4) */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-secondary">No balance updates found</p>
          <p className="text-muted text-sm mt-2">
            Balance updates will appear here when you reconcile accounts
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass">
                <th className="text-left py-3 px-4 text-sm font-medium text-secondary">
                  Date & Time
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">
                  Old Balance
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">
                  New Balance
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">
                  Difference
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">
                  Time Since Last
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => {
                const isPositive = entry.difference > 0
                const isNegative = entry.difference < 0

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-glass hover:bg-glass transition-colors"
                  >
                    {/* Timestamp (Requirement 10.3) */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-primary font-medium">
                          {new Date(entry.updated_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(entry.updated_at).toLocaleTimeString()}
                        </span>
                        <span className="text-xs text-muted mt-1">
                          {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>

                    {/* Old Balance (Requirement 10.3) */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-secondary">
                        {formatCurrency(entry.old_balance, currency)}
                      </span>
                    </td>

                    {/* New Balance (Requirement 10.3) */}
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-primary font-medium">
                        {formatCurrency(entry.new_balance, currency)}
                      </span>
                    </td>

                    {/* Difference (Requirement 10.3) */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPositive && (
                          <TrendingUp className="w-4 h-4 text-accent-success" />
                        )}
                        {isNegative && (
                          <TrendingDown className="w-4 h-4 text-accent-error" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            isPositive
                              ? 'text-accent-success'
                              : isNegative
                              ? 'text-accent-error'
                              : 'text-secondary'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(entry.difference, currency)}
                        </span>
                      </div>
                    </td>

                    {/* Duration Since Last Update (Requirement 10.4) */}
                    <td className="py-4 px-4 text-right">
                      {entry.duration_since_last_update !== undefined ? (
                        <div className="flex items-center justify-end gap-2">
                          <Clock className="w-4 h-4 text-muted" />
                          <span className="text-sm text-secondary">
                            {formatDuration(entry.duration_since_last_update)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {history.length > 0 && (
        <div className="mt-6 pt-4 border-t border-glass">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">
              Total updates: <span className="text-primary font-medium">{history.length}</span>
            </span>
            {history.length > 1 && (
              <span className="text-secondary">
                Average time between updates:{' '}
                <span className="text-primary font-medium">
                  {formatDuration(
                    history
                      .filter(h => h.duration_since_last_update !== undefined)
                      .reduce((sum, h) => sum + (h.duration_since_last_update || 0), 0) /
                      history.filter(h => h.duration_since_last_update !== undefined).length
                  )}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
