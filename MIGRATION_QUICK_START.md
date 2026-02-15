# Quick Start: Apply User Journey Migrations

## 🚀 Quick Steps (5 minutes)

### 1. Open Supabase Dashboard
Visit: https://supabase.com/dashboard/project/szspuivemixdjzyohwrc/sql/new

### 2. Apply 3 Migrations

Copy and paste each file content into SQL Editor, then click "Run":

#### Migration 1: Transaction Status
File: `supabase/migrations/20260213000000_add_transaction_status_field.sql`

#### Migration 2: User Settings
File: `supabase/migrations/20260213000001_create_user_settings_table.sql`

#### Migration 3: Fix Balance View
File: `supabase/migrations/20260213000002_fix_account_actual_balances_view.sql`

### 3. Verify Success

Run this in SQL Editor:
```sql
-- Should return 3 rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN ('status', 'planned_date', 'completed_at');
```

### 4. Generate Types
```bash
npm run db:types
```

### 5. Test
```bash
npm run dev
# Test creating a transaction
```

## ✅ Done!

Your database is now ready for the User Journey Enhancement feature.

---

## 📚 Full Documentation

- **Detailed Plan:** `docs/DEPLOYMENT_PLAN_USER_JOURNEY.md`
- **Status Tracking:** `docs/MIGRATION_STATUS.md`
- **Rollback:** `supabase/migrations/ROLLBACK_20260213_user_journey.sql`

## 🆘 If Something Goes Wrong

Run the rollback script from `supabase/migrations/ROLLBACK_20260213_user_journey.sql` in SQL Editor.

