'use client'

import { HelpCircle } from 'lucide-react'
import { Tooltip } from './tooltip'
import { cn } from '@/lib/utils'

interface HelpIconProps {
  content: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function HelpIcon({ content, side = 'top', className }: HelpIconProps) {
  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center',
          'text-secondary hover:text-primary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 rounded-full',
          className
        )}
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </Tooltip>
  )
}
