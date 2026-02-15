#!/usr/bin/env node

/**
 * Apply single migration using direct SQL execution via Supabase REST API
 * This is the most reliable method that bypasses all connection issues
 */

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

async function executeSqlStatement(statement) {
  // Use Supabase REST API to execute SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: statement })
  })

  return { ok: response.ok, status: response.status, text: await response.text() }
}

async function applyMigration() {
  try {
    console.log('🔗 Connecting to Supabase...')

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260214114425_add_transaction_status_fields.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📋 Applying transaction status fields migration...')

    // Execute the entire SQL as one statement
    console.log('  Executing migration SQL...')
    
    // Try to execute via REST API
    const result = await executeSqlStatement(sql)
    
    if (!result.ok) {
      console.log(`  ⚠️  REST API execution not available (status: ${result.status})`)
      console.log('  ℹ️  This is expected - Supabase doesn\'t expose exec RPC by default')
    }

    // Verify by checking if columns exist
    console.log('\n🔍 Verifying migration...')
    
    const verifyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transactions?select=id,status,planned_date,completed_at&limit=1`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    )

    if (verifyResponse.ok) {
      console.log('✅ Migration verified - columns exist!')
      const data = await verifyResponse.json()
      if (data && data.length > 0) {
        console.log('  Sample row:', data[0])
      }
      console.log('\n✅ Migration already applied or successfully completed')
      return
    }

    // If verification failed, columns don't exist - need manual application
    const errorText = await verifyResponse.text()
    if (errorText.includes('column') && (errorText.includes('does not exist') || errorText.includes('status'))) {
      console.log('⚠️  Columns do not exist yet')
      console.log('\n📝 Applying migration via SQL statements...')
      
      // Try individual ALTER TABLE statements
      const statements = [
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'planned'))`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS planned_date DATE`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_planned_date ON transactions(planned_date) WHERE status = 'planned'`
      ]

      for (let i = 0; i < statements.length; i++) {
        console.log(`  Executing statement ${i + 1}/${statements.length}...`)
        const result = await executeSqlStatement(statements[i])
        if (result.ok) {
          console.log(`    ✅ Statement ${i + 1} executed`)
        } else {
          console.log(`    ⏭️  Statement ${i + 1} skipped (may already exist)`)
        }
      }

      // Verify again
      const finalVerify = await fetch(
        `${SUPABASE_URL}/rest/v1/transactions?select=id,status,planned_date,completed_at&limit=1`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          }
        }
      )

      if (finalVerify.ok) {
        console.log('\n✅ Migration verified after execution!')
        return
      }
    }

    // If we get here, manual intervention needed
    console.log('\n⚠️  Automatic migration could not be completed')
    console.log('\n📝 Manual steps required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Paste and run this SQL:')
    console.log('\n' + sql)
    console.log('\n3. Then run: npm run db:types')
    process.exit(1)

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
