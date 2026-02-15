/**
 * Empty State with Action Component
 * 
 * Reusable empty state component with helpful guidance and call-to-action buttons.
 * Follows Executive Lounge design aesthetic.
 */

'use client'

import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface EmptyStateWithActionProps {
  /** Icon to display */
  icon: LucideIcon
  /** Main title */
  title: string
  /** Description text */
  description: string
  /** Optional helpful guidance */
  guidance?: string
  /** Call-to-action button config */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Optional secondary action */
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyStateWithAction({
  icon: Icon,
  title,
  description,
  guidance,
  action,
  secondaryAction,
}: EmptyStateWithActionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      <div className="mb-4 p-4 bg-glass rounded-2xl border border-glass">
        <Icon className="w-12 h-12 text-secondary opacity-50" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-primary mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-secondary max-w-md mb-4">
        {description}
      </p>

      {/* Guidance */}
      {guidance && (
        <div className="mb-6 p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-lg max-w-md">
          <p className="text-xs text-accent-primary">
            💡 {guidance}
          </p>
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button variant="primary" size="md">
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button 
                variant="primary" 
                size="md"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="secondary" size="md">
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button 
                variant="secondary" 
                size="md"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}
