'use client'

/**
 * TanStack Query hooks over the repository. Reads are cached by key; mutations
 * invalidate the keys whose values they can change (balances depend on both
 * accounts and transactions, so money-moving mutations invalidate both).
 */

import { useMutation, useQuery, useInfiniteQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getRepository } from '@/lib/data'
import {bulkTransactions,listImportRecords,type ImportBatch,type BulkEvent} from '@/lib/data/import-history'
import type {
  LedgerFilter,
  TransactionCursor,
  SaveRecurringInput,
  CreateAccountInput,
  CreateCategoryInput,
  CreateCategoryRuleInput,
  CreateTransactionInput,
  TransactionFilter,
  UpdateAccountInput,
  UpdateTransactionInput,
  UpdateCategoryRuleInput,
} from '@/lib/data/repository'
import type { UserSettings, CurrencyCode } from '@/types/domain'

const repo = () => getRepository()

export const qk = {
  workspace: ['workspace'] as const,
  currentUser: ['currentUser'] as const,
  members: ['members'] as const,
  settings: ['settings'] as const,
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  balanceHistory: (id: string) => ['balanceHistory', id] as const,
  categories: ['categories'] as const,
  categoryRules: ['categoryRules'] as const,
  transactionTypes: ['transactionTypes'] as const,
  transactions: (filter?: TransactionFilter) => ['transactions', filter ?? {}] as const,
  recurring: ['recurring'] as const,
  expected: ['expected'] as const,
}

/** Invalidate everything whose value depends on the money ledger. */
function invalidateMoney(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['financial-model'] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['balanceHistory'] })
  qc.invalidateQueries({ queryKey: ['expected'] })
  qc.invalidateQueries({ queryKey: ['recurring'] })
  qc.invalidateQueries({ queryKey: ['importBatches'] })
  qc.invalidateQueries({ queryKey: ['bulkHistory'] })
  qc.invalidateQueries({ queryKey: ['loans'] })
  qc.invalidateQueries({ queryKey: ['categories'] })
  qc.invalidateQueries({ queryKey: ['settings'] });qc.invalidateQueries({queryKey:['resolutionHistory']})
}

// --- reads -----------------------------------------------------------------

export const useWorkspace = () => useQuery({ queryKey: qk.workspace, queryFn: () => repo().getWorkspace() })
export const useCurrentUser = () => useQuery({ queryKey: qk.currentUser, queryFn: () => repo().getCurrentUser() })
export const useMembers = () => useQuery({ queryKey: qk.members, queryFn: () => repo().listMembers() })
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: () => repo().getSettings() })

export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: () => repo().listAccounts() })
export const useAccount = (id: string) =>
  useQuery({ queryKey: qk.account(id), queryFn: () => repo().getAccount(id), enabled: !!id })
export const useBalanceHistory = (id: string) =>
  useQuery({ queryKey: qk.balanceHistory(id), queryFn: () => repo().listBalanceHistory(id), enabled: !!id })

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: () => repo().listCategories() })
export const useCategoryRules = () =>
  useQuery({ queryKey: qk.categoryRules, queryFn: () => repo().listCategoryRules() })
export const useTransactionTypes = () =>
  useQuery({ queryKey: qk.transactionTypes, queryFn: () => repo().listTransactionTypes() })

export const useTransactions = (filter?: TransactionFilter) =>
  useQuery({ queryKey: qk.transactions(filter), queryFn: () => repo().listTransactions(filter) })

export function useTransactionPages(filter:LedgerFilter){
 return useInfiniteQuery({
  queryKey:['transactions','pages','date-order-v2',filter],
  initialPageParam:undefined as {cursor:TransactionCursor;snapshot:string}|undefined,
  queryFn:({pageParam})=>repo().listTransactionPage(filter,pageParam?.cursor,pageParam?.snapshot),
  getNextPageParam:page=>page.nextCursor?{cursor:page.nextCursor,snapshot:page.snapshot}:undefined,
 })
}
export function useSelectTransactions(){return useMutation({mutationFn:({filter,snapshot}:{filter:LedgerFilter;snapshot:string})=>repo().selectTransactions(filter,snapshot)})}

export const useRecurring = () => useQuery({ queryKey: qk.recurring, queryFn: () => repo().listRecurring() })
export const useExpected = () => useQuery({ queryKey: qk.expected, queryFn: () => repo().listExpected() })

// --- account mutations -----------------------------------------------------

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) => repo().createAccount(input),
    onSuccess: () => invalidateMoney(qc),
  })
}
export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateAccountInput }) => repo().updateAccount(id, patch),
    onSuccess: () => invalidateMoney(qc),
  })
}
export function useArchiveAccount() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => repo().archiveAccount(id), onSuccess: () => invalidateMoney(qc) })
}
export function useReconcileAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newBalance, note }: { id: string; newBalance: number; note?: string }) =>
      repo().reconcileAccount(id, newBalance, note),
    onSuccess: () => invalidateMoney(qc),
  })
}

// --- category mutations ----------------------------------------------------

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => repo().createCategory(input),
    onSuccess: () => {qc.invalidateQueries({ queryKey: qk.categories });qc.invalidateQueries({queryKey:['financial-model']})},
  })
}
export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateCategoryInput> }) => repo().updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories }),
  })
}
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo().deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
export function useCreateCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryRuleInput) => repo().createCategoryRule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categoryRules }),
  })
}
export function useUpdateCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCategoryRuleInput }) =>
      repo().updateCategoryRule(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categoryRules }),
  })
}
export function useDeleteCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo().deleteCategoryRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categoryRules })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// --- transaction mutations -------------------------------------------------

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => repo().createTransaction(input),
    onSuccess: () => invalidateMoney(qc),
  })
}
export function useImportTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({inputs,fileName,requestId}: {inputs:CreateTransactionInput[];fileName?:string;requestId?:string}) => repo().bulkCreateTransactions(inputs,{fileName,requestId}),
    onSuccess: () => invalidateMoney(qc),
  })
}
export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTransactionInput }) => repo().updateTransaction(id, patch),
    onSuccess: () => invalidateMoney(qc),
  })
}
export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => repo().softDeleteTransaction(id), onSuccess: () => invalidateMoney(qc) })
}
export function useRestoreTransaction() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => repo().restoreTransaction(id), onSuccess: () => invalidateMoney(qc) })
}
export function useCompleteTransaction() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => repo().completeTransaction(id), onSuccess: () => invalidateMoney(qc) })
}

export function useSaveRecurring() {
  const qc = useQueryClient()
  return useMutation({mutationFn:(input:SaveRecurringInput)=>repo().saveRecurring(input),onSuccess:()=>invalidateMoney(qc)})
}

// --- settings mutations ----------------------------------------------------

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Omit<UserSettings, 'userId' | 'workspaceId'>>) => repo().updateSettings(patch),
    onSuccess: () => {qc.invalidateQueries({ queryKey: qk.settings });qc.invalidateQueries({queryKey:qk.accounts})},
  })
}
export function useBulkTransactions(){
 const qc=useQueryClient()
 return useMutation({mutationFn:bulkTransactions,onSuccess:()=>invalidateMoney(qc)})
}
export const useImportBatches=()=>useQuery({queryKey:['importBatches'],queryFn:()=>listImportRecords<ImportBatch>('import_batches')})
export const useBulkHistory=()=>useQuery({queryKey:['bulkHistory'],queryFn:()=>listImportRecords<BulkEvent>('bulk_history')})

