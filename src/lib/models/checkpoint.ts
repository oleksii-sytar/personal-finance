import type { 
  Checkpoint, 
  CheckpointRow 
} from '@/types/checkpoint'

export class CheckpointModel {
  /**
   * Calculate gap between expected and actual balances
   * Requirements: 2.5, 4.4
   */
  static calculateGap(actualBalance: number, expectedBalance: number): number {
    return actualBalance - expectedBalance
  }

  /**
   * Calculate expected balance from previous checkpoint and transactions
   * Requirements: 2.3, 2.4, 4.2, 4.3
   */
  static async calculateExpectedBalance(
    accountId: string,
    checkpointDate: Date,
    workspaceId: string,
    supabaseClient: any
  ): Promise<number> {
    const supabase = supabaseClient
    
    // Find most recent previous checkpoint for same account
    const { data: previousCheckpoint } = await supabase
      .from('checkpoints')
      .select('actual_balance, date')
      .eq('workspace_id', workspaceId)
      .eq('account_id', accountId)
      .lt('date', checkpointDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Starting balance (0 if no previous checkpoint)
    const startingBalance = previousCheckpoint?.actual_balance || 0
    const startDate = previousCheckpoint?.date 
      ? new Date(previousCheckpoint.date) 
      : new Date(0)

    // Sum all transactions between start date and checkpoint date
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('workspace_id', workspaceId)
      .eq('account_id', accountId)
      .gt('transaction_date', startDate.toISOString())
      .lte('transaction_date', checkpointDate.toISOString())
      .is('deleted_at', null)

    const transactionSum = transactions?.reduce((sum: number, tx: any) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
    }, 0) || 0

    return startingBalance + transactionSum
  }

  /**
   * Convert database row to domain model
   */
  static fromRow(row: CheckpointRow): Checkpoint {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      account_id: row.account_id!,
      date: new Date(row.date!),
      actual_balance: row.actual_balance!,
      expected_balance: row.expected_balance!,
      gap: row.gap!,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }

  /**
   * Convert domain model to database row
   */
  static toRow(checkpoint: Checkpoint): Omit<CheckpointRow, 'created_at' | 'updated_at'> & {
    created_at?: string
    updated_at?: string
  } {
    return {
      id: checkpoint.id,
      workspace_id: checkpoint.workspace_id,
      account_id: checkpoint.account_id,
      date: checkpoint.date.toISOString().split('T')[0],
      actual_balance: checkpoint.actual_balance,
      expected_balance: checkpoint.expected_balance,
      gap: checkpoint.gap,
    }
  }
}