#!/usr/bin/env node

/**
 * Verify Transaction Status Fields
 * 
 * This script checks if transactions have correct status and planned_date fields.
 * It helps diagnose issues with month filtering for planned transactions.
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

async function verifyTransactionStatus() {
  console.log('🔍 Verifying transaction status fields...\n')

  try {
    // Fetch all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, description, transaction_date, status, planned_date, completed_at')
      .order('transaction_date', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ Error fetching transactions:', error.message)
      process.exit(1)
    }

    if (!transactions || transactions.length === 0) {
      console.log('ℹ️  No transactions found in database')
      return
    }

    console.log(`Found ${transactions.length} transactions:\n`)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let issuesFound = 0

    transactions.forEach((t, index) => {
      const txDate = new Date(t.transaction_date)
      const isFuture = txDate > today
      const hasCorrectStatus = isFuture ? t.status === 'planned' : t.status === 'completed'
      const hasPlannedDate = t.status === 'planned' ? !!t.planned_date : true

      const statusIcon = hasCorrectStatus ? '✓' : '✗'
      const dateIcon = hasPlannedDate ? '✓' : '✗'

      console.log(`${index + 1}. ${t.description || 'No description'}`)
      console.log(`   Transaction Date: ${t.transaction_date}`)
      console.log(`   ${statusIcon} Status: ${t.status || 'NULL'}`)
      console.log(`   ${dateIcon} Planned Date: ${t.planned_date || 'NULL'}`)
      console.log(`   Completed At: ${t.completed_at || 'NULL'}`)
      console.log(`   Is Future: ${isFuture ? 'Yes' : 'No'}`)

      if (!hasCorrectStatus || !hasPlannedDate) {
        issuesFound++
        console.log(`   ⚠️  ISSUE: ${!hasCorrectStatus ? 'Wrong status for date' : 'Missing planned_date'}`)
      }

      console.log('')
    })

    if (issuesFound > 0) {
      console.log(`\n⚠️  Found ${issuesFound} transactions with status issues`)
      console.log('\nTo fix these issues, you can:')
      console.log('1. Delete the problematic transactions and recreate them')
      console.log('2. Or run a migration to update existing transactions')
    } else {
      console.log('\n✅ All transactions have correct status fields')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run verification
verifyTransactionStatus()
