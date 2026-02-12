/**
 * AccountTypeBadge Component
 * 
 * Displays the account type as a styled badge with glass background
 * and type-specific accent colors following Executive Lounge aesthetic.
 * 
 * Requirements: 2.6, 7.6
 */

import type { AccountType } from '@/types'
import { getAccountTypeLabel, getAccountTypeColor } from '@/lib/constants/accounts'
import { cn } from '@/lib/utils'

export interface AccountTypeBadgeProps {
  /**
   * The account type to display
   */
  type: AccountType
  
  /**
   * Optional additional CSS classes
   */
  className?: string
}

/**
 * AccountTypeBadge component displays user-friendly account type labels
 * with glass styling and type-specific accent colors.
 * 
 * Label Mapping:
 * - checking → "Checking Account"
 * - savings → "Savings Account"
 * - credit → "Credit Account"
 * - investment → "Investment Account"
 * 
 * Styling:
 * - Glass background with backdrop blur
 * - Type-specific accent colors
 * - Mobile-friendly sizing (min 44px touch target)
 * - Rounded corners following Executive Lounge aesthetic
 * 
 * @example
 * <AccountTypeBadge type="checking" />
 * <AccountTypeBadge type="savings" className="text-sm" />
 */
export function AccountTypeBadge({ type, className }: AccountTypeBadgeProps) {
  const label = getAccountTypeLabel(type)
  const colorClass = getAccountTypeColor(type)
  
  return (
    <span
      className={cn(
        // Glass background with Executive Lounge styling
        'inline-flex items-center justify-center',
        'bg-glass backdrop-blur-sm',
        'border border-glass',
        'rounded-full',
        'px-3 py-2',
        'min-h-[44px]', // Mobile-friendly touch target
        'text-xs font-medium',
        // Type-specific accent color
        colorClass,
        // Smooth transitions
        'transition-all duration-200',
        // Hover effect
        'hover:bg-glass/80 hover:border-accent',
        className
      )}
      role="status"
      aria-label={`Account type: ${label}`}
    >
      {label}
    </span>
  )
}
