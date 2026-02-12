/**
 * AccountTypeIcon Component
 * 
 * Displays the appropriate icon for an account type with Executive Lounge styling.
 * Icons use accent colors from the design system to provide visual distinction.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { AccountType } from '@/types'
import { getAccountTypeIcon, getAccountTypeColor } from '@/lib/constants/accounts'
import { cn } from '@/lib/utils'

export interface AccountTypeIconProps {
  /**
   * The account type to display an icon for
   */
  type: AccountType
  
  /**
   * Optional additional CSS classes
   */
  className?: string
}

/**
 * AccountTypeIcon component displays the appropriate icon for each account type
 * with Executive Lounge accent colors.
 * 
 * Icon Mapping:
 * - checking → Wallet icon (Single Malt Gold)
 * - savings → PiggyBank icon (Growth Emerald)
 * - credit → CreditCard icon (Amber)
 * - investment → TrendingUp icon (Warm Bronze)
 * 
 * @example
 * <AccountTypeIcon type="checking" className="w-6 h-6" />
 */
export function AccountTypeIcon({ type, className }: AccountTypeIconProps) {
  const Icon = getAccountTypeIcon(type)
  const colorClass = getAccountTypeColor(type)
  
  return (
    <Icon 
      className={cn(
        colorClass,
        'transition-colors duration-200',
        className
      )} 
      aria-label={`${type} account icon`}
    />
  )
}
