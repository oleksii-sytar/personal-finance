#!/usr/bin/env node

/**
 * Apply migrations directly using Postgres connection
 * This is the most reliable method for applying migrations
 */

import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING

if (!POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL_NON_POOLING required in .env.local')
  process.exit(1)
}

async function applyMigrations() {
  const client = new Client({
    connectionString: POSTGRES_URL
  })

  try {
    console.log('🔗 Connecting to Postgres database...')
    await client.connect()
    console.log('✅ Connected to database')

    // Get migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    if (files.length === 0) {
      console.log('ℹ️  No migration files found')
      await client.end()
      return
    }

    console.log(`📋 Found ${files.length} migration file(s)`)

    // Apply only the specific migration we need
    const targetFile = '20260214114425_add_transaction_status_fields.sql'
    
    if (!files.includes(targetFile)) {
      console.error(`❌ Migration file not found: ${targetFile}`)
      await client.end()
      process.exit(1)
    }

    console.log(`🔄 Applying ${targetFile}...`)
    const sql = readFileSync(join(migrationsDir, targetFile), 'utf-8')
    
    try {
      await client.query(sql)
      console.log(`✅ Applied ${targetFile}`)
    } catch (error) {
      // Check if columns already exist
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  ${targetFile} already applied (columns exist)`)
      } else {
        throw error
      }
    }

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
    console.log('✅ Migration process completed')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

applyMigrations()
