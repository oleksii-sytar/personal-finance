#!/bin/bash
# Script to help apply the migration via Supabase Dashboard

echo "🔄 Opening Supabase SQL Editor..."
echo ""
echo "📋 Migration file: supabase/migrations/20260204000000_add_accounts_initial_balance_and_default.sql"
echo ""

# Copy migration SQL to clipboard (macOS)
if command -v pbcopy &> /dev/null; then
  cat supabase/migrations/20260204000000_add_accounts_initial_balance_and_default.sql | pbcopy
  echo "✅ Migration SQL copied to clipboard!"
  echo ""
fi

# Open the SQL editor in browser
echo "🌐 Opening Supabase SQL Editor in your browser..."
open "https://supabase.com/dashboard/project/szspuivemixdjzyohwrc/sql/new"

echo ""
echo "📝 Next steps:"
echo "   1. The SQL Editor should open in your browser"
echo "   2. The migration SQL is already in your clipboard"
echo "   3. Paste (Cmd+V) into the SQL Editor"
echo "   4. Click 'Run' or press Cmd+Enter"
echo "   5. Wait for confirmation"
echo ""
echo "📖 For detailed instructions, see: scripts/migration-instructions.md"
echo ""
echo "✅ After migration is applied, run: npm run test -- account"
