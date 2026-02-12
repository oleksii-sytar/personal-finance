#!/usr/bin/env node

/**
 * Force cleanup script for test users
 * Removes all related data before deleting users
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

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

async function forceCleanupTestUsers() {
  console.log('🧹 Starting FORCE cleanup of test users...\n')

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError

    // Filter test users
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

    let successCount = 0
    let errorCount = 0

    for (const user of testUsers) {
      console.log(`\n🔄 Processing: ${user.email}`)
      
      try {
        // Delete related data in order (respecting foreign key constraints)
        
        // 1. Delete transactions (soft-deleted ones too)
        const { error: txError } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
        if (txError) console.log(`   ⚠️  Transactions: ${txError.message}`)
        else console.log(`   ✅ Deleted transactions`)

        // 2. Delete recurring transactions
        const { error: recurError } = await supabase
          .from('recurring_transactions')
          .delete()
          .eq('user_id', user.id)
        if (recurError) console.log(`   ⚠️  Recurring: ${recurError.message}`)
        else console.log(`   ✅ Deleted recurring transactions`)

        // 3. Delete expected transactions
        const { error: expError } = await supabase
          .from('expected_transactions')
          .delete()
          .eq('user_id', user.id)
        if (expError) console.log(`   ⚠️  Expected: ${expError.message}`)
        else console.log(`   ✅ Deleted expected transactions`)

        // 4. Delete checkpoints
        const { error: cpError } = await supabase
          .from('checkpoints')
          .delete()
          .eq('user_id', user.id)
        if (cpError) console.log(`   ⚠️  Checkpoints: ${cpError.message}`)
        else console.log(`   ✅ Deleted checkpoints`)

        // 5. Delete categories
        const { error: catError } = await supabase
          .from('categories')
          .delete()
          .eq('user_id', user.id)
        if (catError) console.log(`   ⚠️  Categories: ${catError.message}`)
        else console.log(`   ✅ Deleted categories`)

        // 6. Delete transaction types
        const { error: typeError } = await supabase
          .from('transaction_types')
          .delete()
          .eq('user_id', user.id)
        if (typeError) console.log(`   ⚠️  Transaction types: ${typeError.message}`)
        else console.log(`   ✅ Deleted transaction types`)

        // 7. Delete workspace members
        const { error: memberError } = await supabase
          .from('workspace_members')
          .delete()
          .eq('user_id', user.id)
        if (memberError) console.log(`   ⚠️  Workspace members: ${memberError.message}`)
        else console.log(`   ✅ Deleted workspace members`)

        // 8. Delete workspace invitations
        const { error: inviteError } = await supabase
          .from('workspace_invitations')
          .delete()
          .eq('inviter_id', user.id)
        if (inviteError) console.log(`   ⚠️  Invitations: ${inviteError.message}`)
        else console.log(`   ✅ Deleted invitations`)

        // 9. Delete accounts
        const { error: accError } = await supabase
          .from('accounts')
          .delete()
          .eq('workspace_id', user.id)
        if (accError) console.log(`   ⚠️  Accounts: ${accError.message}`)
        else console.log(`   ✅ Deleted accounts`)

        // 10. Delete workspaces owned by user
        const { error: wsError } = await supabase
          .from('workspaces')
          .delete()
          .eq('owner_id', user.id)
        if (wsError) console.log(`   ⚠️  Workspaces: ${wsError.message}`)
        else console.log(`   ✅ Deleted workspaces`)

        // 11. Delete user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', user.id)
        if (profileError) console.log(`   ⚠️  Profile: ${profileError.message}`)
        else console.log(`   ✅ Deleted profile`)

        // 12. Finally delete the auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.log(`   ❌ Failed to delete user: ${deleteError.message}`)
          errorCount++
        } else {
          console.log(`   ✅ Deleted user from auth`)
          successCount++
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`)
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

forceCleanupTestUsers()
