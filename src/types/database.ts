export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          workspace_id: string
          account_id: string
          user_id: string
          amount: number
          currency: string
          description: string
          type: 'income' | 'expense'
          transaction_date: string
          category_id: string | null
          transaction_type_id: string | null
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          is_expected: boolean
          expected_transaction_id: string | null
          recurring_transaction_id: string | null
          status: 'completed' | 'planned'
          planned_date: string | null
          completed_at: string | null
          locked: boolean
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          account_id: string
          user_id?: string
          amount: number
          currency: string
          description: string
          type: 'income' | 'expense'
          transaction_date: string
          category_id?: string | null
          transaction_type_id?: string | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          is_expected?: boolean
          expected_transaction_id?: string | null
          recurring_transaction_id?: string | null
          status?: 'completed' | 'planned'
          planned_date?: string | null
          completed_at?: string | null
          locked?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          account_id?: string
          user_id?: string
          amount?: number
          currency?: string
          description?: string
          type?: 'income' | 'expense'
          transaction_date?: string
          category_id?: string | null
          transaction_type_id?: string | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          is_expected?: boolean
          expected_transaction_id?: string | null
          recurring_transaction_id?: string | null
          status?: 'completed' | 'planned'
          planned_date?: string | null
          completed_at?: string | null
          locked?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string | null
          deleted_at?: string | null
        }
      }
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
