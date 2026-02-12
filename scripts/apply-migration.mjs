#!/usr/bin/env node
/**
 * Script to apply database migration directly using Supabase client
 * This bypasses the Supabase CLI and applies the migration SQL directly
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🔄 Applying migration: 20260204000000_add_accounts_initial_balance_and_default.sql')
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260204000000_add_accounts_initial_balance_and_default.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration SQL loaded successfully')
    console.log('📊 Executing migration...')
    
    // Execute the migration SQL
    // Note: Supabase client doesn't have a direct SQL execution method for DDL
    // We need to use the REST API or RPC
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // Use rpc to execute raw SQL (if available)
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message)
          throw error
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`)
      } catch (err) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, err.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
        throw err
      }
    }
    
    console.log('\n✅ Migration applied successfully!')
    console.log('🎉 Database schema updated with initial_balance and is_default columns')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\n💡 Alternative approach: Use Supabase Dashboard SQL Editor')
    console.error('   1. Go to: https://supabase.com/dashboard/project/szspuivemixdjzyohwrc/sql')
    console.error('   2. Copy the contents of: supabase/migrations/20260204000000_add_accounts_initial_balance_and_default.sql')
    console.error('   3. Paste into the SQL Editor and click "Run"')
    process.exit(1)
  }
}

// Run the migration
applyMigration()
