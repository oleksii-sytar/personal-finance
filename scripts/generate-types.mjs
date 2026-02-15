#!/usr/bin/env node

/**
 * Generate TypeScript types from Supabase database
 * Uses direct database connection to avoid CLI authentication issues
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!PROJECT_REF) {
  console.log('⚠️  Could not extract project ref from SUPABASE_URL')
  console.log('ℹ️  Using existing types')
  process.exit(0)
}

async function generateTypes() {
  try {
    console.log('🔧 Generating TypeScript types from database...')
    console.log(`   Project: ${PROJECT_REF}`)

    // Use supabase gen types with project-id instead of --linked
    // This avoids the password prompt
    const command = `supabase gen types typescript --project-id ${PROJECT_REF} > src/types/database.ts`
    
    execSync(command, {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_SERVICE_KEY
      }
    })

    console.log('✅ Types generated successfully')

  } catch (error) {
    console.log('⚠️  Type generation failed:', error.message)
    console.log('ℹ️  Using existing types - this is OK for development')
    console.log('ℹ️  Types will be regenerated on next successful connection')
  }
}

generateTypes()
