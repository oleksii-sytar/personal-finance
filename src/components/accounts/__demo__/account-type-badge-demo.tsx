/**
 * AccountTypeBadge Demo
 * 
 * Visual demonstration of the AccountTypeBadge component
 * showing all account types with their respective styling.
 * 
 * This file is for development/documentation purposes only.
 */

import { AccountTypeBadge } from '../account-type-badge'
import type { AccountType } from '@/types'

export function AccountTypeBadgeDemo() {
  const accountTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment']
  
  return (
    <div className="p-8 space-y-8 bg-primary min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">Account Type Badges</h2>
        <p className="text-secondary mb-6">
          Executive Lounge styled badges with glass background and type-specific accent colors
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">All Account Types</h3>
        <div className="flex flex-wrap gap-4">
          {accountTypes.map(type => (
            <AccountTypeBadge key={type} type={type} />
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Individual Examples</h3>
        
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-secondary">Checking:</span>
            <AccountTypeBadge type="checking" />
            <span className="text-muted text-xs">(Single Malt Gold)</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-secondary">Savings:</span>
            <AccountTypeBadge type="savings" />
            <span className="text-muted text-xs">(Growth Emerald)</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-secondary">Credit:</span>
            <AccountTypeBadge type="credit" />
            <span className="text-muted text-xs">(Amber)</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-secondary">Investment:</span>
            <AccountTypeBadge type="investment" />
            <span className="text-muted text-xs">(Warm Bronze)</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Mobile Touch Target</h3>
        <div className="glass-card p-6">
          <p className="text-secondary mb-4">
            All badges have a minimum height of 44px for mobile accessibility
          </p>
          <div className="flex gap-4">
            <AccountTypeBadge type="checking" />
            <div className="flex items-center text-muted text-xs">
              ← Min 44px height
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Custom Styling</h3>
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-secondary">Larger text:</span>
            <AccountTypeBadge type="savings" className="text-sm" />
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-secondary">Extra padding:</span>
            <AccountTypeBadge type="credit" className="px-6 py-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
