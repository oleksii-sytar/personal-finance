#!/usr/bin/env node

/**
 * Direct database migration script
 * Applies SQL migrations directly to the database without interactive prompts
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Disable SSL certificate validation for Supabase cloud connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Get database URL from environment
const DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: POSTGRES_URL_NON_POOLING or DATABASE_URL environment variable not set')
  process.exit(1)
}

async function applyMigrations() {
  // Parse the connection string and modify SSL settings
  const connectionConfig = {
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  }

  const client = new Client(connectionConfig)

  try {
    await client.connect()
    console.log('✅ Connected to database')

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

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Check which migrations have been applied
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM _migrations'
    )
    const appliedSet = new Set(appliedMigrations.map(r => r.name))

    // If no migrations recorded but tables exist, mark all as applied
    if (appliedSet.size === 0) {
      const { rows: tables } = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('workspaces', 'accounts', 'transactions')
      `)
      
      if (tables.length > 0) {
        console.log('ℹ️  Database already has tables, marking existing migrations as applied...')
        for (const file of files) {
          await client.query(
            'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
            [file]
          )
          appliedSet.add(file)
        }
        console.log('✅ All existing migrations marked as applied')
        return
      }
    }

    // Apply pending migrations
    let appliedCount = 0
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`)
        continue
      }

      console.log(`🔄 Applying ${file}...`)
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        console.log(`✅ Applied ${file}`)
        appliedCount++
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`❌ Error applying ${file}:`, error.message)
        throw error
      }
    }

    if (appliedCount === 0) {
      console.log('✅ All migrations already applied')
    } else {
      console.log(`✅ Successfully applied ${appliedCount} migration(s)`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyMigrations()
