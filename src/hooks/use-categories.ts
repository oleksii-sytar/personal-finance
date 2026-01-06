import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import supabase from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/workspace-context'
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  mergeCategories,
  getCategoriesByUsage,
  getDefaultCategory,
  ensureDefaultCategories
} from '@/actions/categories'
import type { Category } from '@/types'

/**
 * Hook for fetching categories with optional type filtering
 * Following code-quality.md naming and structure patterns
 */
export function useCategories(type?: 'income' | 'expense') {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['categories', workspaceId, type],
    queryFn: async (): Promise<Category[]> => {
      if (!workspaceId) return []

      let query = supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return data || []
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook for fetching categories with workspace ID parameter (legacy)
 */
export function useCategoriesWithWorkspace(workspaceId: string, type?: 'income' | 'expense') {
  return useQuery({
    queryKey: ['categories', workspaceId, type],
    queryFn: async (): Promise<Category[]> => {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name')

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return data || []
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook for fetching categories ordered by usage frequency
 */
export function useCategoriesByUsage(workspaceId: string, type?: 'income' | 'expense') {
  return useQuery({
    queryKey: ['categories-by-usage', workspaceId, type],
    queryFn: async () => {
      const result = await getCategoriesByUsage(workspaceId, type)
      if (result.error) {
        throw new Error(result.error.toString())
      }
      return result.data
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook for fetching a single category by ID
 * SECURITY: Always filters by current workspace ID
 */
export function useCategory(id: string) {
  const { currentWorkspace } = useWorkspace()
  
  return useQuery({
    queryKey: ['category', currentWorkspace?.id, id],
    queryFn: async (): Promise<Category | null> => {
      // SECURITY: Must have a current workspace
      if (!currentWorkspace?.id) {
        return null
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', currentWorkspace.id) // CRITICAL: Filter by workspace
        .single()

      if (error) {
        throw new Error(`Failed to fetch category: ${error.message}`)
      }

      return data
    },
    enabled: !!id && !!currentWorkspace?.id, // Only run when both ID and workspace are available
  })
}

/**
 * Hook for getting default category
 */
export function useDefaultCategory(workspaceId: string, type: 'income' | 'expense') {
  return useQuery({
    queryKey: ['default-category', workspaceId, type],
    queryFn: async () => {
      const result = await getDefaultCategory(workspaceId, type)
      if (result.error) {
        throw new Error(result.error.toString())
      }
      return result.data
    },
    enabled: !!workspaceId && !!type,
  })
}

/**
 * Hook for creating categories
 * SECURITY: Invalidates queries for current workspace only
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: ({ workspaceId, formData }: { workspaceId: string; formData: FormData }) =>
      createCategory(workspaceId, formData),
    onSuccess: (_result, { workspaceId }) => {
      // Invalidate and refetch categories for specific workspace only
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['categories-by-usage', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['default-category', workspaceId] })
    },
  })
}

/**
 * Hook for updating categories
 * SECURITY: Invalidates queries for current workspace only
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateCategory(id, formData),
    onSuccess: (_result, { id }) => {
      // Invalidate and refetch for current workspace only
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['categories-by-usage', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['category', currentWorkspace?.id, id] })
      queryClient.invalidateQueries({ queryKey: ['default-category', currentWorkspace?.id] })
    },
  })
}

/**
 * Hook for deleting categories
 * SECURITY: Invalidates queries for current workspace only
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      // Invalidate and refetch for current workspace only
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['categories-by-usage', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['default-category', currentWorkspace?.id] })
    },
  })
}

/**
 * Hook for merging categories
 * SECURITY: Invalidates queries for current workspace only
 */
export function useMergeCategories() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: ({ fromCategoryId, toCategoryId }: { fromCategoryId: string; toCategoryId: string }) =>
      mergeCategories(fromCategoryId, toCategoryId),
    onSuccess: () => {
      // Invalidate and refetch all category-related queries for current workspace only
      queryClient.invalidateQueries({ queryKey: ['categories', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['categories-by-usage', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', currentWorkspace?.id] })
      queryClient.invalidateQueries({ queryKey: ['default-category', currentWorkspace?.id] })
    },
  })
}

/**
 * Hook for ensuring default categories exist (for migration/repair)
 * SECURITY: Only works for current workspace
 */
export function useEnsureDefaultCategories() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: (workspaceId: string) => ensureDefaultCategories(workspaceId),
    onSuccess: (_result, workspaceId) => {
      // Invalidate and refetch categories for the workspace
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['categories-by-usage', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['default-category', workspaceId] })
    },
  })
}