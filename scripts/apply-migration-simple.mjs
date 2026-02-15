#!/usr/bin/env node

/**
 * Apply specific migration using Supabase client
 * Simplest approach that works with Supabase's SSL setup
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SERVICE_KEY required')
  process.exit(1)
}

async function applyMigration() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('🔗 Connecting to Supabase...')

    // Read the specific migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260214114425_add_transaction_status_fields.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📋 Applying transaction status fields migration...')

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    console.log(`  Found ${statements.length} SQL statements to execute`)

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`  Executing statement ${i + 1}/${statements.length}...`)
      
      try {
        // Use the from() API to execute raw SQL via PostgREST
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        
        if (error) {
          // If exec_sql doesn't exist, try direct query
          if (error.message.includes('function') || error.message.includes('does not exist')) {
            console.log(`    ℹ️  Statement ${i + 1} needs manual application`)
          } else if (error.message.includes('already exists')) {
            console.log(`    ✅ Statement ${i + 1} already applied`)
          } else {
            console.log(`    ⚠️  Statement ${i + 1}: ${error.message}`)
          }
        } else {
          console.log(`    ✅ Statement ${i + 1} executed`)
        }
      } catch (err) {
        console.log(`    ⚠️  Statement ${i + 1}: ${err.message}`)
      }
    }

    // Verify columns exist by querying transactions table
    console.log('\n🔍 Verifying migration...')
    const { data, error } = await supabase
      .from('transactions')
      .select('id, status, planned_date, completed_at')
      .limit(1)

    if (error) {
      console.log('⚠️  Verification failed:', error.message)
      console.log('\n📝 Manual steps required:')
      console.log('1. Go to Supabase Dashboard → SQL Editor')
      console.log('2. Copy SQL from: supabase/migrations/20260214114425_add_transaction_status_fields.sql')
      console.log('3. Run the SQL')
      console.log('4. Then run: npm run db:types')
      process.exit(1)
    } else {
      console.log('✅ Migration verified - columns exist!')
      if (data && data.length > 0) {
        console.log('  Sample row:', data[0])
      }
    }

    console.log('\n✅ Migration process completed')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Manual steps required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy SQL from: supabase/migrations/20260214114425_add_transaction_status_fields.sql')
    console.log('3. Run the SQL')
    console.log('4. Then run: npm run db:types')
    process.exit(1)
  }
}

applyMigration()
