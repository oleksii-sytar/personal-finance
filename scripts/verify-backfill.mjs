#!/usr/bin/env node

/**
 * Query database to get actual transaction schema
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

async function verifySchema() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  console.log('🔍 Querying actual transaction schema...\n')

  // Get a sample transaction to see all fields
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  if (data && data.length > 0) {
    console.log('✅ Sample transaction fields:')
    console.log(JSON.stringify(data[0], null, 2))
    console.log('\n📋 Field names:')
    console.log(Object.keys(data[0]).sort().join(', '))
  } else {
    console.log('⚠️  No transactions found in database')
  }
}

verifySchema()
