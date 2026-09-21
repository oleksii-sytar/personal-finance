import { ACCOUNT_TYPE_META } from '@/lib/constants/accounts'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types/domain'

const sizeMap = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6' },
}

/** Coloured icon tile for an account type. */
export function AccountTypeIcon({
  type,
  size = 'md',
  className,
}: {
  type: AccountType
  size?: keyof typeof sizeMap
  className?: string
}) {
  const meta = ACCOUNT_TYPE_META[type]
  const Icon = meta.icon
  const s = sizeMap[size]
  return (
    <span
      className={cn('inline-flex items-center justify-center', s.box, className)}
      style={{
        color: meta.accent,
        backgroundColor: `color-mix(in srgb, ${meta.accent} 14%, transparent)`,
      }}
      aria-hidden="true"
    >
      <Icon className={s.icon} />
    </span>
  )
}

/** Small labelled badge describing the account type. */
export function AccountTypeBadge({ type }: { type: AccountType }) {
  const meta = ACCOUNT_TYPE_META[type]
  return <Badge tone={meta.class === 'liability' ? 'error' : 'neutral'}>{meta.label}</Badge>
}