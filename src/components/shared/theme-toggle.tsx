'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { SegmentedControl } from '@/components/ui/segmented'

/** Light / Dark / System theme switch. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <SegmentedControl
      aria-label="Тема"
      className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-2 [&>button]:text-xs"
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'light', label: "Світла", icon: <Sun className="h-4 w-4" /> },
        { value: 'dark', label: "Темна", icon: <Moon className="h-4 w-4" /> },
        { value: 'system', label: "Авто", icon: <Monitor className="h-4 w-4" /> },
      ]}
    />
  )
}