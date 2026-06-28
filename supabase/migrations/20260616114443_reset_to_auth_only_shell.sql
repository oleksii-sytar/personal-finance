-- Reset Forma to an auth-only shell.
-- This intentionally removes the finance/workspace data model and clears users.

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;

drop table if exists public.transactions cascade;
drop table if exists public.expected_transactions cascade;
drop table if exists public.recurring_transactions cascade;
drop table if exists public.balance_update_history cascade;
drop table if exists public.reconciliation_sessions cascade;
drop table if exists public.reconciliation_periods_archive cascade;
drop table if exists public.checkpoints_archive cascade;
drop table if exists public.exchange_rates cascade;
drop table if exists public.transaction_types cascade;
drop table if exists public.categories cascade;
drop table if exists public.accounts cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.workspace_invitations cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.user_profiles cascade;
drop view if exists public.account_actual_balances cascade;
drop view if exists public.admin_transactions cascade;

drop function if exists public.add_workspace_owner() cascade;
drop function if exists public.create_default_account(uuid, character varying) cascade;
drop function if exists public.create_default_transaction_types(uuid) cascade;
drop function if exists public.create_user_profile(uuid, text, text) cascade;
drop function if exists public.get_current_user_email() cascade;
drop function if exists public.get_user_workspace_context() cascade;
drop function if exists public.get_user_workspace_memberships(uuid) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.prevent_opening_balance_change() cascade;
drop function if exists public.update_reconciliation_sessions_updated_at() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.user_has_account_access(uuid) cascade;
drop function if exists public.user_has_workspace_access(uuid) cascade;
drop function if exists public.verify_workspace_access(uuid, uuid) cascade;

delete from auth.users;
