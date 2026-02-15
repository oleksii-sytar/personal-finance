'use client'

import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface MonthSelectorProps {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  transactionCounts?: Record<string, number> // month key (yyyy-MM) -> count
  className?: string
}

export function MonthSelector({
  selectedMonth,
  onMonthChange,
  transactionCounts = {},
  className
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Generate month options (past 12 months + future 6 months)
  const monthOptions = useMemo(() => {
    const options: { date: Date; label: string; count: number }[] = []
    
    // Past 12 months
    for (let i = -12; i <= 0; i++) {
      const date = addMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const key = format(monthStart, 'yyyy-MM')
      const count = transactionCounts[key] || 0
      
      options.push({
        date: monthStart,
        label: format(monthStart, 'MMMM yyyy'),
        count
      })
    }
    
    // Future 6 months (for planned transactions)
    for (let i = 1; i <= 6; i++) {
      const date = addMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const key = format(monthStart, 'yyyy-MM')
      const count = transactionCounts[key] || 0
      
      options.push({
        date: monthStart,
        label: format(monthStart, 'MMMM yyyy'),
        count
      })
    }
    
    return options
  }, [transactionCounts])
  
  const currentOption = monthOptions.find(opt => 
    isSameMonth(opt.date, selectedMonth)
  )
  
  const handlePrevious = () => {
    onMonthChange(subMonths(selectedMonth, 1))
  }
  
  const handleNext = () => {
    onMonthChange(addMonths(selectedMonth, 1))
  }
  
  const handleToday = () => {
    onMonthChange(new Date())
    setIsOpen(false)
  }
  
  const isCurrentMonth = isSameMonth(selectedMonth, new Date())
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Previous Month Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handlePrevious}
        aria-label="Previous month"
        className="h-10 w-10 p-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      
      {/* Month Dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className="min-w-[200px] justify-between h-10 px-4"
            aria-label="Select month"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{currentOption?.label}</span>
              {currentOption && currentOption.count > 0 && (
                <span className="text-xs text-secondary">
                  ({currentOption.count})
                </span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-64 p-0 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-lg"
          align="start"
        >
          <div className="max-h-96 overflow-y-auto">
            {monthOptions.map(option => {
              const isSelected = isSameMonth(option.date, selectedMonth)
              const isToday = isSameMonth(option.date, new Date())
              
              return (
                <button
                  key={format(option.date, 'yyyy-MM')}
                  onClick={() => {
                    onMonthChange(option.date)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors',
                    'hover:bg-[var(--bg-glass)] focus:bg-[var(--bg-glass)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/20',
                    isSelected && 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
                    !isSelected && 'text-[var(--text-primary)]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {option.label}
                      {isToday && (
                        <span className="ml-2 text-xs text-[var(--accent-primary)]">
                          (Today)
                        </span>
                      )}
                    </span>
                    {option.count > 0 && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        {option.count} {option.count === 1 ? 'transaction' : 'transactions'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Next Month Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleNext}
        aria-label="Next month"
        className="h-10 w-10 p-0"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      
      {/* Today Quick Jump Button */}
      {!isCurrentMonth && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleToday}
          className="h-10 px-4"
        >
          Today
        </Button>
      )}
    </div>
  )
}
