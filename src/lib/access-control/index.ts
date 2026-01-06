/**
 * Access Control Module
 * 
 * Centralized access control utilities for workspace-based authorization
 * Implements Requirements 10.1, 10.2, 10.3, 10.4
 */

export {
  verifyWorkspaceMembership,
  getUserWorkspaceMemberships,
  verifyTransactionAccess,
  authorizeWorkspaceOperation,
  authorizeTransactionOperation,
  getCurrentUserWorkspaceContext,
  validateWorkspaceAccess,
  authorizeWorkspaceAccess,
  type WorkspaceMembership,
  type AccessControlResult
} from './workspace-access'