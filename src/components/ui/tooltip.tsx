'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  maxWidth?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  maxWidth = '300px'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return

    const trigger = triggerRef.current
    const tooltip = tooltipRef.current
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()

    let x = 0
    let y = 0

    switch (side) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.top - tooltipRect.height - 8
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 8
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Keep tooltip within viewport
    const padding = 8
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding))
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding))

    setPosition({ x, y })
  }, [isVisible, side])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'fixed z-50 px-3 py-2 text-sm rounded-lg shadow-lg pointer-events-none',
            'bg-primary border border-primary text-primary',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxWidth
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}
