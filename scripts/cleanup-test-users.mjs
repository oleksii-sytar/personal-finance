#!/usr/bin/env node

/**
 * Cleanup script for test users
 * Removes all users with email addresses matching test patterns
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupTestUsers() {
  console.log('🧹 Starting test user cleanup...\n')

  try {
    // Get all users from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw listError
    }

    console.log(`📊 Found ${users.length} total users`)

    // Filter test users (emails containing 'test-' or '@example.com')
    const testUsers = users.filter(user => 
      user.email?.includes('test-') || 
      user.email?.includes('@example.com') ||
      user.email?.includes('@example.co')
    )

    console.log(`🎯 Found ${testUsers.length} test users to delete\n`)

    if (testUsers.length === 0) {
      console.log('✅ No test users to clean up')
      return
    }

    // Delete each test user
    let successCount = 0
    let errorCount = 0

    for (const user of testUsers) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`❌ Failed to delete ${user.email}: ${deleteError.message}`)
          errorCount++
        } else {
          console.log(`✅ Deleted: ${user.email}`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Error deleting ${user.email}:`, err.message)
        errorCount++
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   ✅ Successfully deleted: ${successCount}`)
    console.log(`   ❌ Failed to delete: ${errorCount}`)
    console.log(`   📊 Total processed: ${testUsers.length}`)

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    process.exit(1)
  }
}

cleanupTestUsers()
