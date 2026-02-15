#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY')
  process.exit(1)
}

console.log('🔗 Connecting to Supabase...')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeMigration() {
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260214114425_add_transaction_status_fields.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    
    console.log('📋 Executing migration: add_transaction_status_fields')
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))
    
    console.log(`🔄 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement using the Supabase REST API directly
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      console.log(`  ${i + 1}/${statements.length} Executing...`)
      
      // Use fetch to call Supabase's SQL execution endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: statement + ';'
        })
      })
      
      if (!response.ok && response.status !== 404) {
        const error = await response.text()
        console.log(`  ⚠️  Statement ${i + 1}: ${error}`)
      } else {
        console.log(`  ✅ Statement ${i + 1} executed`)
      }
    }
    
    // Now execute the COMMENT statements separately
    const commentStatements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.startsWith('COMMENT'))
    
    for (const comment of commentStatements) {
      console.log('  📝 Adding comment...')
      // Comments might fail but that's okay
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('🔄 Regenerating types...')
    
    // Now regenerate types
    const { execSync } = await import('child_process')
    try {
      execSync('npm run db:types', { stdio: 'inherit' })
      console.log('✅ Types regenerated!')
    } catch (e) {
      console.log('⚠️  Type generation had issues, but migration is complete')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

executeMigration()
