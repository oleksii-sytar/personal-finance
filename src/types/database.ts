export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          id: string
          name: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          name: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean
          name: string
          type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency: string
          date: string
          fetched_at: string | null
          id: string
          rate: number
        }
        Insert: {
          currency: string
          date: string
          fetched_at?: string | null
          id?: string
          rate: number
        }
        Update: {
          currency?: string
          date?: string
          fetched_at?: string | null
          id?: string
          rate?: number
        }
        Relationships: []
      }
      expected_transactions: {
        Row: {
          actual_transaction_id: string | null
          created_at: string
          currency: string
          expected_amount: number
          expected_date: string
          id: string
          recurring_transaction_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          actual_transaction_id?: string | null
          created_at?: string
          currency?: string
          expected_amount: number
          expected_date: string
          id?: string
          recurring_transaction_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          actual_transaction_id?: string | null
          created_at?: string
          currency?: string
          expected_amount?: number
          expected_date?: string
          id?: string
          recurring_transaction_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expected_transactions_actual_transaction_id_fkey"
            columns: ["actual_transaction_id"]
            isOneToOne: false
            referencedRelation: "admin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_actual_transaction_id_fkey"
            columns: ["actual_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          interval_count: number
          is_active: boolean
          next_due_date: string
          start_date: string
          template_data: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          frequency: string
          id?: string
          interval_count?: number
          is_active?: boolean
          next_due_date: string
          start_date: string
          template_data: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          next_due_date?: string
          start_date?: string
          template_data?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          family: string
          icon: string | null
          id: string
          is_default: boolean
          is_system: boolean
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          family: string
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          family?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string
          currency: string
          deleted_at: string | null
          description: string
          expected_transaction_id: string | null
          id: string
          is_expected: boolean
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          recurring_transaction_id: string | null
          transaction_date: string
          transaction_type_id: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by: string
          currency?: string
          deleted_at?: string | null
          description: string
          expected_transaction_id?: string | null
          id?: string
          is_expected?: boolean
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          recurring_transaction_id?: string | null
          transaction_date: string
          transaction_type_id?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string
          deleted_at?: string | null
          description?: string
          expected_transaction_id?: string | null
          id?: string
          is_expected?: boolean
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          recurring_transaction_id?: string | null
          transaction_date?: string
          transaction_type_id?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_expected_transaction_id_fkey"
            columns: ["expected_transaction_id"]
            isOneToOne: false
            referencedRelation: "expected_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transaction_type_id_fkey"
            columns: ["transaction_type_id"]
            isOneToOne: false
            referencedRelation: "transaction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          token: string
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_transactions: {
        Row: {
          amount: number | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          expected_transaction_id: string | null
          id: string | null
          is_deleted: boolean | null
          is_expected: boolean | null
          notes: string | null
          original_amount: number | null
          original_currency: string | null
          recurring_transaction_id: string | null
          transaction_date: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_transaction_id?: string | null
          id?: string | null
          is_deleted?: never
          is_expected?: boolean | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          recurring_transaction_id?: string | null
          transaction_date?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_transaction_id?: string | null
          id?: string | null
          is_deleted?: never
          is_expected?: boolean | null
          notes?: string | null
          original_amount?: number | null
          original_currency?: string | null
          recurring_transaction_id?: string | null
          transaction_date?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_expected_transaction_id_fkey"
            columns: ["expected_transaction_id"]
            isOneToOne: false
            referencedRelation: "expected_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_default_transaction_types: {
        Args: { workspace_id: string }
        Returns: undefined
      }
      create_user_profile: {
        Args: { full_name?: string; user_email: string; user_id: string }
        Returns: undefined
      }
      get_current_user_email: { Args: never; Returns: string }
      get_user_workspace_context: {
        Args: never
        Returns: {
          role: string
          workspace_id: string
        }[]
      }
      get_user_workspace_memberships: {
        Args: { p_user_id: string }
        Returns: {
          role: string
          workspace_id: string
        }[]
      }
      verify_workspace_access: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const