/**
 * Middleware Module
 * 
 * Authorization middleware for transaction operations
 * Implements Requirements 10.1, 10.2, 10.3, 10.4
 */

export {
  authorizeTransactionCreate,
  authorizeTransactionRead,
  authorizeTransactionUpdate,
  authorizeTransactionDelete,
  getUserWorkspaceContext,
  withWorkspaceAuth,
  withTransactionAuth,
  type AuthorizationResult
} from './transaction-auth'