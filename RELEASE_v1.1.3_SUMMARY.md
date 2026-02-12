# Release v1.1.3 - Critical RLS and Invitation Fixes

**Release Date**: February 12, 2026  
**Type**: Hotfix Release  
**Priority**: Critical

## Overview

This release addresses critical security and functionality issues that were blocking workspace members from accessing shared resources. The primary focus is fixing Row Level Security (RLS) policies to properly support workspace-based collaboration.

## Critical Fixes

### 1. Workspace Member Access (CRITICAL)
**Problem**: Invited workspace members could not access any workspace resources (accounts, categories, transactions) because RLS policies only checked workspace ownership, not membership.

**Solution**: 
- Created `user_has_workspace_access(workspace_uuid UUID)` SECURITY DEFINER function
- Updated all RLS policies to check workspace membership via `workspace_members` table
- Fixed PostgreSQL error 42P17 (ambiguous column reference) that occurred when clients added filters

**Impact**: Workspace collaboration now works correctly. Members can access all shared resources.

**Affected Tables**:
- `accounts`
- `categories`
- `transaction_types`
- `workspaces` (read access)
- `balance_update_history`
- `reconciliation_sessions`
- `exchange_rates` (public read)

### 2. Invitation Acceptance Page
**Problem**: Invitation acceptance page was showing "under construction" message instead of the acceptance form.

**Solution**:
- Restored `InviteAcceptanceForm` component that was commented out
- Changed redirect from `router.push()` to `window.location.href` to force full page reload
- Ensures workspace context is properly updated after accepting invitation

**Impact**: Users can now accept workspace invitations successfully.

### 3. Transaction Sorting
**Problem**: Transactions were sorted by `created_at` (when entered) instead of `transaction_date` (when they actually happened).

**Solution**:
- Changed ordering in `useTransactions` and `useInfiniteTransactions` hooks
- Now sorts by `transaction_date DESC` for both functions

**Impact**: Transaction list now shows most recent transactions first based on actual transaction date.

### 4. Category Manager Without Workspace
**Problem**: Category management interface was visible even when no workspace existed.

**Solution**:
- Added workspace existence check to `CategoryManager` component
- Shows helpful message: "Please create or select a workspace to manage categories."

**Impact**: Better UX, prevents confusion when no workspace is available.

## Database Migrations

### Migration: `20260212195955_fix_accounts_rls_for_members.sql`
- Updated accounts table RLS policies to check workspace membership

### Migration: `20260212200758_fix_all_rls_for_workspace_members.sql`
- Updated RLS policies for all workspace-related tables
- Comprehensive fix for workspace member access

### Migration: `20260212200935_enable_rls_on_all_tables.sql`
- Explicitly enabled RLS on all workspace-related tables
- Ensures policies are enforced

### Migration: `20260212201144_fix_rls_with_security_definer_function.sql`
- Created `user_has_workspace_access()` SECURITY DEFINER function
- Final solution to eliminate ambiguous column references
- All RLS policies now use this function

## Security Improvements

1. **Enhanced RLS Coverage**: All workspace-related tables now have proper RLS policies
2. **Workspace Membership Validation**: Secure function-based membership checks
3. **Ambiguous Reference Prevention**: SECURITY DEFINER function eliminates PostgreSQL errors
4. **Explicit RLS Enablement**: All tables explicitly have RLS enabled

## Testing

All fixes have been tested with:
- Workspace owner creating resources
- Invited members accessing shared resources
- Transaction list sorting verification
- Category manager workspace checks
- Invitation acceptance flow

## Deployment Notes

### Pre-Deployment
- Database migrations will be applied automatically
- No data migration required
- No breaking changes

### Post-Deployment Verification
1. Test invitation acceptance flow
2. Verify workspace member can access accounts
3. Verify workspace member can access categories
4. Check transaction list sorting (most recent first)
5. Verify category manager shows workspace check

## Breaking Changes

None. This is a backward-compatible hotfix release.

## Known Issues

None identified.

## Next Steps

- Monitor for any RLS-related issues
- Continue testing workspace collaboration features
- Plan for additional workspace features in v1.2.0

## Contributors

- AI Assistant (Kiro)

---

**Upgrade Instructions**: Deploy as usual. Migrations will apply automatically.

**Rollback Plan**: If issues occur, revert to v1.1.2 and investigate.
