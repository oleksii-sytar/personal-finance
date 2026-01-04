'use client'

import { useTheme } from '@/contexts/theme-context'
import { Button } from '@/components/ui/Button'
import { Sun, Moon, Monitor } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
}

/**
 * Theme toggle component with three options: Light, Dark, and System
 * 
 * Features:
 * - Immediate theme switching on selection
 * - Visual indication of active theme
 * - Keyboard accessibility and screen reader compatibility
 * - Executive Lounge aesthetic with glass card styling
 */
export function ThemeToggle({ 
  className = '', 
  showLabels = true 
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Day Studio theme with light backgrounds'
    },
    {
      value: 'dark' as const,
      label: 'Dark', 
      icon: Moon,
      description: 'Night Cockpit theme with dark backgrounds'
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
      description: 'Follow your operating system preference'
    }
  ]

  return (
    <div 
      className={`glass-card p-4 ${className}`}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {showLabels && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Theme
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Choose your preferred theme or follow system settings
          </p>
        </div>
      )}
      
      <div className="flex gap-2">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.value
          const isCurrentlyApplied = theme === 'system' 
            ? resolvedTheme === option.value 
            : theme === option.value

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300
                border border-[var(--glass-border)]
                hover:bg-[var(--bg-glass)] hover:border-[var(--accent-primary)]/30
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/20
                ${isActive 
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50 text-[var(--accent-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
                ${isCurrentlyApplied && theme === 'system' 
                  ? 'ring-2 ring-[var(--accent-primary)]/30' 
                  : ''
                }
              `}
              role="radio"
              aria-checked={isActive}
              aria-describedby={`theme-${option.value}-description`}
              title={option.description}
            >
              <Icon 
                size={18} 
                className={`
                  transition-colors duration-300
                  ${isActive ? 'text-[var(--accent-primary)]' : 'text-current'}
                `}
                aria-hidden="true"
              />
              {showLabels && (
                <span className="text-sm font-medium">
                  {option.label}
                </span>
              )}
              
              {/* Screen reader description */}
              <span 
                id={`theme-${option.value}-description`}
                className="sr-only"
              >
                {option.description}
                {isActive && ', currently selected'}
                {isCurrentlyApplied && theme === 'system' && ', currently applied by system'}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Additional context for system theme */}
      {theme === 'system' && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--glass-border)]">
          <p className="text-xs text-[var(--text-secondary)]">
            Following system preference: 
            <span className="text-[var(--accent-primary)] font-medium ml-1">
              {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}