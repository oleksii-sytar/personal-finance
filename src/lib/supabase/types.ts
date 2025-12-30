import type { Database } from '@/types/database'

// Convenience types for common database operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types for authentication and workspace features
export type User = Database['public']['Tables']['user_profiles']['Row']
export type UserInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserUpdate = Database['public']['Tables']['user_profiles']['Update']

export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert']
export type WorkspaceMemberUpdate = Database['public']['Tables']['workspace_members']['Update']

export type WorkspaceInvitation = Database['public']['Tables']['workspace_invitations']['Row']
export type WorkspaceInvitationInsert = Database['public']['Tables']['workspace_invitations']['Insert']
export type WorkspaceInvitationUpdate = Database['public']['Tables']['workspace_invitations']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type ExchangeRateInsert = Database['public']['Tables']['exchange_rates']['Insert']
export type ExchangeRateUpdate = Database['public']['Tables']['exchange_rates']['Update']

// Extended types with relationships
export type WorkspaceWithMembers = Workspace & {
  workspace_members: (WorkspaceMember & {
    user_profiles: User
  })[]
}

export type WorkspaceWithInvitations = Workspace & {
  workspace_invitations: WorkspaceInvitation[]
}

export type TransactionWithDetails = Transaction & {
  categories: Category
  accounts: Account
}

// Auth result types for server actions
export type AuthResult<T = any> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

export type WorkspaceResult<T = any> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

// Role types
export type WorkspaceRole = 'owner' | 'member'

// Common query filters
export interface WorkspaceFilter {
  workspace_id: string
}

export interface DateRangeFilter {
  start_date?: string
  end_date?: string
}

export interface PaginationFilter {
  limit?: number
  offset?: number
}