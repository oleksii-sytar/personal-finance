'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCheckpointsForTimeline } from '@/actions/checkpoints'
import { createClient } from '@/lib/supabase/client'
import type { Checkpoint } from '@/types/checkpoint'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, TrendingDown, Minus, Info, Receipt, ChevronDown, ChevronRight } from 'lucide-react'

interface CheckpointTimelineViewProps {
  workspaceId: string
  accountId?: string
  className?: string
}

interface CheckpointWithDetails extends Checkpoint {
  transaction_count?: number
  days_since_previous?: number
}

// Helper function to get transaction count for a checkpoint period
async function getTransactionCountForPeriod(
  accountId: string,
  checkpointDate: Date,
  previousCheckpointDate: Date | null,
  workspaceId: string
): Promise<number> {
  const supabase = createClient()
  
  const startDate = previousCheckpointDate || new Date(0)
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('account_id', accountId)
    .gt('transaction_date', startDate.toISOString())
    .lte('transaction_date', checkpointDate.toISOString())
    .is('deleted_at', null)
  
  if (error) {
    console.error('Error fetching transaction count:', error)
    return 0
  }
  
  return transactions?.length || 0
}

export function CheckpointTimelineView({ 
  workspaceId, 
  accountId, 
  className = '' 
}: CheckpointTimelineViewProps) {
  const [checkpoints, setCheckpoints] = useState<CheckpointWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string | null>(null)
  const [transactionCounts, setTransactionCounts] = useState<Record<string, number>>({})
  const [loadingCounts, setLoadingCounts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchCheckpoints() {
      try {
        setIsLoading(true)
        setError(null)
        
        const result = await getCheckpointsForTimeline(workspaceId, accountId)
        
        if (result.error) {
          setError(typeof result.error === 'string' ? result.error : 'Failed to load checkpoints')
        } else {
          setCheckpoints(result.data || [])
        }
      } catch (err) {
        console.error('Error fetching checkpoints:', err)
        setError('Failed to load checkpoints')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCheckpoints()
  }, [workspaceId, accountId])

  // Handle checkpoint click to expand/collapse
  const handleCheckpointClick = async (checkpoint: CheckpointWithDetails) => {
    // Toggle expansion
    if (expandedCheckpoint === checkpoint.id) {
      setExpandedCheckpoint(null)
      return
    }
    
    setExpandedCheckpoint(checkpoint.id)
    
    // Fetch transaction count if we don't have it yet
    if (transactionCounts[checkpoint.id] === undefined && !loadingCounts[checkpoint.id] && checkpoint.account_id) {
      setLoadingCounts(prev => ({ ...prev, [checkpoint.id]: true }))
      
      try {
        // Find the previous checkpoint to determine the period
        const checkpointIndex = checkpoints.findIndex(c => c.id === checkpoint.id)
        const previousCheckpoint = checkpointIndex < checkpoints.length - 1 
          ? checkpoints[checkpointIndex + 1] 
          : null
        
        const count = await getTransactionCountForPeriod(
          checkpoint.account_id,
          checkpoint.date,
          previousCheckpoint?.date || null,
          workspaceId
        )
        
        setTransactionCounts(prev => ({ ...prev, [checkpoint.id]: count }))
      } catch (err) {
        console.error('Error fetching transaction count:', err)
      } finally {
        setLoadingCounts(prev => ({ ...prev, [checkpoint.id]: false }))
      }
    }
  }

  const getGapIndicatorColor = (gap: number, isInitial: boolean = false) => {
    if (isInitial) return 'text-accent-info' // Blue for initial checkpoint
    if (gap === 0) return 'text-accent-success' // Green for perfect match
    if (gap > 0) return 'text-accent-info' // Blue for surplus
    return 'text-accent-error' // Red for deficit
  }

  const getGapIndicatorIcon = (gap: number, isInitial: boolean = false) => {
    if (isInitial) return <Calendar className="w-3 h-3" />
    if (gap === 0) return <Minus className="w-3 h-3" />
    if (gap > 0) return <TrendingUp className="w-3 h-3" />
    return <TrendingDown className="w-3 h-3" />
  }

  const getGapBadgeVariant = (gap: number, isInitial: boolean = false) => {
    if (isInitial) return 'secondary'
    if (gap === 0) return 'default'
    if (gap > 0) return 'secondary'
    return 'destructive'
  }

  const getGapDescription = (gap: number, isInitial: boolean = false) => {
    if (isInitial) return 'Initial'
    if (gap === 0) return 'Perfect match'
    if (gap > 0) return 'Surplus'
    return 'Deficit'
  }

  if (isLoading) {
    return (
      <Card variant="glass" className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
            <span className="ml-3 text-secondary">Loading checkpoints...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="glass" className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8 text-accent-error">
            <Info className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (checkpoints.length === 0) {
    return (
      <Card variant="glass" className={`${className}`}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="font-space-grotesk text-lg font-semibold text-primary mb-2">
              No Checkpoints Yet
            </h3>
            <p className="text-secondary mb-4">
              Create your first checkpoint to start tracking your balance accuracy over time.
            </p>
            <p className="text-muted text-sm">
              Checkpoints help you identify gaps between your recorded transactions and actual account balances.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass" className={`${className}`}>
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="font-space-grotesk text-lg font-semibold text-primary mb-1">
            Checkpoint Timeline
          </h3>
          <p className="text-secondary text-sm">
            Track balance accuracy over time • {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-4">
          {checkpoints.map((checkpoint, index) => {
            const isInitialCheckpoint = index === checkpoints.length - 1 // Last in array = first chronologically
            
            return (
              <div
                key={checkpoint.id}
                className="relative"
              >
                <div 
                  className="flex items-start space-x-4 cursor-pointer hover:bg-glass/50 rounded-lg p-2 -m-2 transition-all duration-200"
                  onClick={() => handleCheckpointClick(checkpoint)}
                >
                  {/* Gap indicator dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full border-2 border-current ${getGapIndicatorColor(checkpoint.gap, isInitialCheckpoint)} bg-glass flex items-center justify-center`}>
                      {getGapIndicatorIcon(checkpoint.gap, isInitialCheckpoint)}
                    </div>
                  </div>

                  {/* Checkpoint details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-primary">
                          {formatDate(checkpoint.date)}
                        </span>
                        <Badge variant={getGapBadgeVariant(checkpoint.gap, isInitialCheckpoint)} className="text-xs">
                          {getGapDescription(checkpoint.gap, isInitialCheckpoint)}
                        </Badge>
                        {/* Expand/collapse indicator */}
                        <div className="text-muted transition-transform duration-200">
                          {expandedCheckpoint === checkpoint.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">
                          {formatCurrency(checkpoint.actual_balance)}
                        </div>
                        {!isInitialCheckpoint && checkpoint.gap !== 0 && (
                          <div className={`text-sm ${getGapIndicatorColor(checkpoint.gap, isInitialCheckpoint)}`}>
                            {checkpoint.gap > 0 ? '+' : ''}{formatCurrency(checkpoint.gap)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable details with smooth animation */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedCheckpoint === checkpoint.id 
                          ? 'max-h-96 opacity-100 mt-3' 
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 bg-glass-elevated rounded-lg border border-glass text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          {!isInitialCheckpoint && (
                            <div>
                              <span className="text-muted">Expected Balance:</span>
                              <div className="font-medium text-primary">
                                {formatCurrency(checkpoint.expected_balance)}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-muted">{isInitialCheckpoint ? 'Initial Balance:' : 'Actual Balance:'}</span>
                            <div className="font-medium text-primary">
                              {formatCurrency(checkpoint.actual_balance)}
                            </div>
                          </div>
                          {!isInitialCheckpoint && (
                            <div>
                              <span className="text-muted">Gap Amount:</span>
                              <div className={`font-medium ${getGapIndicatorColor(checkpoint.gap, isInitialCheckpoint)}`}>
                                {checkpoint.gap === 0 ? '₴0.00' : `${checkpoint.gap > 0 ? '+' : ''}${formatCurrency(Math.abs(checkpoint.gap))}`}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-muted">Created:</span>
                            <div className="font-medium text-primary">
                              {formatDate(checkpoint.created_at, { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Transaction count and period details - only for non-initial checkpoints */}
                        {!isInitialCheckpoint && (
                          <div className="mt-4 pt-3 border-t border-glass">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Receipt className="w-4 h-4 text-muted" />
                                <span className="text-muted">Transactions in Period:</span>
                              </div>
                              <div className="font-medium text-primary">
                                {loadingCounts[checkpoint.id] ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-accent-primary"></div>
                                    <span className="text-xs text-muted">Loading...</span>
                                  </div>
                                ) : transactionCounts[checkpoint.id] !== undefined ? (
                                  <span>
                                    {transactionCounts[checkpoint.id]} transaction{transactionCounts[checkpoint.id] !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted">Click to load</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Period information */}
                            {(() => {
                              const checkpointIndex = checkpoints.findIndex(c => c.id === checkpoint.id)
                              const previousCheckpoint = checkpointIndex < checkpoints.length - 1 
                                ? checkpoints[checkpointIndex + 1] 
                                : null
                              
                              if (previousCheckpoint) {
                                const daysDiff = Math.ceil(
                                  (checkpoint.date.getTime() - previousCheckpoint.date.getTime()) / (1000 * 60 * 60 * 24)
                                )
                                return (
                                  <div className="mt-2 text-xs text-muted">
                                    Period: {formatDate(previousCheckpoint.date)} to {formatDate(checkpoint.date)} ({daysDiff} days)
                                  </div>
                                )
                              } else {
                                return (
                                  <div className="mt-2 text-xs text-muted">
                                    Period: From beginning to {formatDate(checkpoint.date)}
                                  </div>
                                )
                              }
                            })()}
                            
                            {/* Gap explanation */}
                            <div className="mt-2 text-xs text-muted">
                              {checkpoint.gap === 0 && "Perfect match! Your recorded transactions align exactly with your actual balance."}
                              {checkpoint.gap > 0 && "Surplus: Your actual balance is higher than expected from recorded transactions."}
                              {checkpoint.gap < 0 && "Deficit: Your actual balance is lower than expected from recorded transactions."}
                            </div>
                          </div>
                        )}
                        
                        {/* Initial checkpoint explanation */}
                        {isInitialCheckpoint && (
                          <div className="mt-4 pt-3 border-t border-glass">
                            <div className="text-xs text-muted">
                              This is your initial checkpoint - the starting balance for tracking your financial accuracy over time.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Timeline summary */}
        {checkpoints.length > 1 && (
          <div className="mt-6 pt-4 border-t border-primary">
            <div className="flex justify-between text-sm text-secondary">
              <span>
                Oldest: {formatDate(checkpoints[checkpoints.length - 1].date)}
              </span>
              <span>
                Latest: {formatDate(checkpoints[0].date)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}