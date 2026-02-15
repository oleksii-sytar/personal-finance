#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugMarchTransaction() {
  console.log('🔍 Debugging March 21 transaction...\n')

  // Find the March 21 transaction
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .or('transaction_date.eq.2026-03-21,planned_date.eq.2026-03-21')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${transactions.length} transactions:\n`)

  transactions.forEach(t => {
    console.log('Transaction Details:')
    console.log('  ID:', t.id)
    console.log('  Description:', t.description)
    console.log('  transaction_date:', t.transaction_date)
    console.log('  planned_date:', t.planned_date)
    console.log('  status:', t.status)
    console.log('  completed_at:', t.completed_at)
    console.log('  created_at:', t.created_at)
    console.log('')

    // Check what the filter logic would do
    const dateToCheck = t.status === 'planned' ? t.planned_date : t.transaction_date
    console.log('  Filter would use:', dateToCheck)
    console.log('  Is in Feb 2026?', dateToCheck >= '2026-02-01' && dateToCheck <= '2026-02-29')
    console.log('  Is in Mar 2026?', dateToCheck >= '2026-03-01' && dateToCheck <= '2026-03-31')
    console.log('')
  })
}

debugMarchTransaction()
