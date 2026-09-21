import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CategoryRulesManager } from '@/components/settings/category-rules-manager'
import { can, type Permission } from '@/lib/auth/permissions'
import type { WorkspaceRole } from '@/types/domain'
const state = vi.hoisted(() => ({ role: 'owner' as WorkspaceRole }))
vi.mock('@/contexts/workspace-context', () => ({ useWorkspaceContext: () => ({ can: (permission: Permission) => can(state.role, permission) }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/hooks/use-finance', () => ({
  useCategoryRules: () => ({ data: [{ id: 'rule', name: 'Test rule', categoryId: 'food', descriptionContains: 'shop', priority: 100, isActive: true }] }),
  useCategories: () => ({ data: [{ id: 'food', name: 'Food', type: 'expense' }] }),
  useCreateCategoryRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategoryRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCategoryRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
afterEach(cleanup)
describe('category rule permissions match the server', () => {
  it.each(['owner', 'manager'] as WorkspaceRole[])('%s can manage rules', role => {
    state.role = role
    render(<CategoryRulesManager />)
    expect(screen.getByRole('button', { name: 'Додати правило' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Редагувати Test rule' })).toBeDefined()
  })
  it.each(['member', 'viewer'] as WorkspaceRole[])('%s sees rules without unavailable actions', role => {
    state.role = role
    render(<CategoryRulesManager />)
    expect(screen.getByText('Test rule')).toBeDefined()
    expect(screen.queryByRole('textbox', { name: 'Назва правила' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Додати правило|Редагувати Test rule|Видалити Test rule/ })).toBeNull()
  })
})
