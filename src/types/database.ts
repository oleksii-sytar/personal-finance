// Minimal database types for build - will be regenerated from Supabase
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
          user_id: string
          account_id: string
          amount: number
          currency: string
          transaction_date: string
          description: string | null
          notes: string | null
          category_id: string | null
          transaction_type_id: string | null
          type: 'income' | 'expense'
          is_expected: boolean
          expected_transaction_id: string | null
          recurring_transaction_id: string | null
          locked: boolean
          original_amount: number | null
          original_currency: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id?: string
          account_id: string
          amount: number
          currency: string
          transaction_date: string
          description?: string | null
          notes?: string | null
          category_id?: string | null
          transaction_type_id?: string | null
          type: 'income' | 'expense'
          is_expected?: boolean
          expected_transaction_id?: string | null
          recurring_transaction_id?: string | null
          locked?: boolean
          original_amount?: number | null
          original_currency?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          account_id?: string
          amount?: number
          currency?: string
          transaction_date?: string
          description?: string | null
          notes?: string | null
          category_id?: string | null
          transaction_type_id?: string | null
          type?: 'income' | 'expense'
          is_expected?: boolean
          expected_transaction_id?: string | null
          recurring_transaction_id?: string | null
          locked?: boolean
          original_amount?: number | null
          original_currency?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          workspace_id: string
          name: string
          icon: string | null
          color: string
          type: 'income' | 'expense' | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          icon?: string | null
          color?: string
          type?: 'income' | 'expense' | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          icon?: string | null
          color?: string
          type?: 'income' | 'expense' | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
