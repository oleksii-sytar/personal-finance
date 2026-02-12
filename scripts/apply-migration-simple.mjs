#!/usr/bin/env node
/**
 * Simple migration application - executes SQL statements individually
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.migration') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkColumns() {
  console.log('🔍 Checking if columns already exist...')
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .limit(1)
  
  if (error) {
    console.log('⚠️  Could not check columns:', error.message)
    return { hasInitialBalance: false, hasIsDefault: false }
  }
  
  if (data && data.length > 0) {
    const account = data[0]
    const hasInitialBalance = 'initial_balance' in account
    const hasIsDefault = 'is_default' in account
    
    console.log(`   initial_balance: ${hasInitialBalance ? '✅ exists' : '❌ missing'}`)
    console.log(`   is_default: ${hasIsDefault ? '✅ exists' : '❌ missing'}`)
    console.log('')
    
    return { hasInitialBalance, hasIsDefault }
  }
  
  return { hasInitialBalance: false, hasIsDefault: false }
}

async function applyMigration() {
  console.log('🔄 Migration: Add initial_balance and is_default columns')
  console.log('')
  
  try {
    // Check current state
    const { hasInitialBalance, hasIsDefault } = await checkColumns()
    
    if (hasInitialBalance && hasIsDefault) {
      console.log('✅ Migration already applied! Both columns exist.')
      console.log('')
      console.log('📝 Next step: Run tests')
      console.log('   npm run test -- account')
      return
    }
    
    console.log('❌ Columns are missing. Migration needs to be applied.')
    console.log('')
    console.log('📋 Please apply the migration manually:')
    console.log('')
    console.log('1️⃣  Open Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/szspuivemixdjzyohwrc/sql/new')
    console.log('')
    console.log('2️⃣  Copy and paste this SQL:')
    console.log('')
    console.log('─'.repeat(80))
    
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260204000000_add_accounts_initial_balance_and_default.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log(migrationSQL)
    console.log('─'.repeat(80))
    console.log('')
    console.log('3️⃣  Click "Run" or press Cmd+Enter')
    console.log('')
    console.log('4️⃣  After applying, run this script again to verify')
    console.log('')
    console.log('💡 Quick command: npm run db:migrate')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

applyMigration()
