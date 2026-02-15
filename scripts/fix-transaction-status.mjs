#!/usr/bin/env node

/**
 * Fix Transaction Status Fields
 * 
 * This script updates existing transactions to have correct status and planned_date fields.
 * It fixes transactions that were created before the status field logic was implemented.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTransactionStatus() {
  console.log('🔧 Fixing transaction status fields...\n')

  try {
    // Fetch all transactions with completed status
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, description, transaction_date, status, planned_date')
      .eq('status', 'completed')
      .order('transaction_date', { ascending: false })

    if (error) {
      console.error('❌ Error fetching transactions:', error.message)
      process.exit(1)
    }

    if (!transactions || transactions.length === 0) {
      console.log('ℹ️  No transactions found to fix')
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find transactions that need fixing
    const transactionsToFix = transactions.filter(t => {
      const txDate = new Date(t.transaction_date)
      return txDate > today // Future transactions with completed status
    })

    if (transactionsToFix.length === 0) {
      console.log('✅ All transactions have correct status fields')
      return
    }

    console.log(`Found ${transactionsToFix.length} transactions to fix:\n`)

    let fixedCount = 0
    let errorCount = 0

    for (const transaction of transactionsToFix) {
      console.log(`Fixing: ${transaction.description || 'No description'}`)
      console.log(`  Date: ${transaction.transaction_date}`)
      console.log(`  Current Status: ${transaction.status}`)

      // Update to planned status with planned_date
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'planned',
          planned_date: transaction.transaction_date,
          completed_at: null
        })
        .eq('id', transaction.id)

      if (updateError) {
        console.error(`  ❌ Error: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✅ Fixed: status='planned', planned_date='${transaction.transaction_date}'`)
        fixedCount++
      }
      console.log('')
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✅ Fixed: ${fixedCount} transactions`)
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} transactions`)
    }
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run fix
fixTransactionStatus()
