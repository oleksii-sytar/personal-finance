/**
 * Role-based permissions. The Financial Manager (owner/manager) runs the money;
 * members log their own spending; viewers are read-only. See product-definition.
 */

import type { WorkspaceRole } from '@/types/domain'

export type Permission =
  | 'account.manage' // create/edit/archive accounts
  | 'transaction.create'
  | 'transaction.manageAll' // edit/delete any member's transactions
  | 'reconcile'
  | 'category.manage'
  | 'members.manage'
  | 'settings.workspace'

const MATRIX: Record<WorkspaceRole, Permission[]> = {
  owner: [
    'account.manage',
    'transaction.create',
    'transaction.manageAll',
    'reconcile',
    'category.manage',
    'members.manage',
    'settings.workspace',
  ],
  manager: [
    'account.manage',
    'transaction.create',
    'transaction.manageAll',
    'reconcile',
    'category.manage',
  ],
  member: ['transaction.create'],
  viewer: [],
}

export function can(role: WorkspaceRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return MATRIX[role].includes(permission)
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Власник",
  manager: "Фінансовий менеджер",
  member: "Учасник",
  viewer: "Спостерігач",
}