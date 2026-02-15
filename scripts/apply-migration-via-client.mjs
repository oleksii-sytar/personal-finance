#!/usr/bin/env node

import pg from 'pg'
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING

console.log('🔗 Connecting to Postgres database...')

async function applyMigration() {
  const client = new Client({
    connectionString: POSTGRES_URL,
    ssl: false  // Disable SSL verification for Supabase
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('📋 Applying transaction status fields migration...')
    
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260214114425_add_transaction_status_fields.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Execute the entire migration
    console.log('  Executing migration SQL...')
    await client.query(migrationSQL)
    console.log('✅ Migration applied successfully!')
    
    // Verify the columns exist
    console.log('🔍 Verifying migration...')
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      AND column_name IN ('status', 'planned_date', 'completed_at')
      ORDER BY column_name
    `)
    
    if (result.rows.length === 3) {
      console.log('✅ All columns verified:')
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
      })
    } else {
      console.log('⚠️  Expected 3 columns, found:', result.rows.length)
    }
    
    await client.end()
    
    console.log('\n🔄 Regenerating TypeScript types...')
    const { execSync } = await import('child_process')
    try {
      execSync('npm run db:types', { stdio: 'inherit', cwd: join(__dirname, '..') })
      console.log('✅ Types regenerated!')
    } catch (e) {
      console.log('⚠️  Type generation had issues, continuing...')
    }
    
    console.log('\n✅ Migration process complete!')
    console.log('🔄 Next: npm run type-check')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

applyMigration()
