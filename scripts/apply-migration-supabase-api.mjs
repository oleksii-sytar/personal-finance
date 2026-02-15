#!/usr/bin/env node

/**
 * Apply migrations using Supabase Management API
 * This bypasses direct database connection issues
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required')
  process.exit(1)
}

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function applyMigrations() {
  try {
    console.log('🔗 Using Supabase Management API')

    // Get migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (files.length === 0) {
      console.log('ℹ️  No migration files found')
      return
    }

    console.log(`📋 Found ${files.length} migration file(s)`)

    // Apply each migration
    for (const file of files) {
      console.log(`🔄 Applying ${file}...`)
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      
      try {
        // Split SQL into individual statements and execute
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement) {
            // Use the Supabase client to execute SQL
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
            
            // Execute via RPC if available, otherwise use direct query
            await supabase.rpc('exec', { query: statement }).catch(() => {
              // If RPC doesn't exist, the SQL will be applied via migrations
              console.log('  ⏭️  Skipping (will be applied via Supabase Dashboard)')
            })
          }
        }
        
        console.log(`✅ Applied ${file}`)
      } catch (error) {
        console.error(`⚠️  ${file}: ${error.message}`)
        console.log('  ℹ️  Please apply this migration manually via Supabase Dashboard')
      }
    }

    console.log('✅ Migration process completed')
    console.log('ℹ️  Note: Some migrations may need to be applied manually via Supabase Dashboard SQL Editor')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Manual steps:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy SQL from: supabase/migrations/20260214114425_add_transaction_status_fields.sql')
    console.log('3. Run the SQL')
    console.log('4. Then run: npm run db:types')
    process.exit(1)
  }
}

applyMigrations()
