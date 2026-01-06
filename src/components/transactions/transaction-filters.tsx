'use client'

import { useState, useEffect } from 'react'
import { Calendar, Search, X, Filter, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/use-categories'
import { useWorkspaceMembers } from '@/hooks/use-workspace-members'
import { useTransactionFilters } from '@/contexts/transaction-filter-context'
import type { DateRangePreset } from '@/types/transactions'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface TransactionFiltersProps {
  className?: string
}

export function TransactionFilters({
  className
}: TransactionFiltersProps) {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTransactionFilters()
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '')
  const [dateRangeOpen, setDateRangeOpen] = useState(false)
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [memberFilterOpen, setMemberFilterOpen] = useState(false)
  
  const { data: categories = [] } = useCategories()
  const { data: members = [] } = useWorkspaceMembers()

  // Update search query when filters change externally
  useEffect(() => {
    setSearchQuery(filters.searchQuery || '')
  }, [filters.searchQuery])

  // Handle search input with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.searchQuery) {
        setFilters({
          ...filters,
          searchQuery: searchQuery.trim() || undefined
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters, setFilters])

  // Handle transaction type filter
  const handleTypeChange = (type: 'all' | 'income' | 'expense') => {
    setFilters({
      ...filters,
      type
    })
  }

  // Handle date range presets
  const handleDateRangePreset = (preset: DateRangePreset) => {
    const today = new Date()
    let dateRange: { start: Date; end: Date } | undefined

    switch (preset) {
      case 'today':
        dateRange = {
          start: startOfDay(today),
          end: endOfDay(today)
        }
        break
      case 'this-week':
        dateRange = {
          start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
          end: endOfWeek(today, { weekStartsOn: 1 })
        }
        break
      case 'this-month':
        dateRange = {
          start: startOfMonth(today),
          end: endOfMonth(today)
        }
        break
      case 'custom':
        // Keep existing custom range or clear it
        dateRange = filters.dateRange
        break
    }

    setFilters({
      ...filters,
      dateRange
    })
    setDateRangeOpen(false)
  }

  // Handle custom date range
  const handleCustomDateRange = (start: Date | undefined, end: Date | undefined) => {
    if (start && end) {
      setFilters({
        ...filters,
        dateRange: {
          start: startOfDay(start),
          end: endOfDay(end)
        }
      })
    } else {
      setFilters({
        ...filters,
        dateRange: undefined
      })
    }
  }

  // Handle category filter
  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = filters.categories || []
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId]

    setFilters({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined
    })
  }

  // Handle member filter
  const handleMemberToggle = (memberId: string) => {
    const currentMembers = filters.members || []
    const newMembers = currentMembers.includes(memberId)
      ? currentMembers.filter(id => id !== memberId)
      : [...currentMembers, memberId]

    setFilters({
      ...filters,
      members: newMembers.length > 0 ? newMembers : undefined
    })
  }

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('')
  }

  // Get active filter count
  const activeFilterCount = [
    filters.searchQuery,
    filters.dateRange,
    filters.categories?.length,
    filters.members?.length,
    filters.type && filters.type !== 'all' ? 1 : 0
  ].filter(Boolean).length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Transaction Type Tabs */}
      <Tabs 
        value={filters.type || 'all'} 
        onValueChange={(value) => handleTypeChange(value as 'all' | 'income' | 'expense')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Search transaction notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {/* Date Range Filter */}
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.dateRange ? 'primary' : 'outline'}
                size="input"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {filters.dateRange ? (
                  <span className="hidden sm:inline">
                    {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d')}
                  </span>
                ) : (
                  <span className="hidden sm:inline">Date</span>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="end" side="bottom" sideOffset={8}>
              <div className="p-3 space-y-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateRangePreset('today')}
                    className="w-full justify-start"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateRangePreset('this-week')}
                    className="w-full justify-start"
                  >
                    This Week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateRangePreset('this-month')}
                    className="w-full justify-start"
                  >
                    This Month
                  </Button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Custom Range</p>
                  <CalendarComponent
                    mode="range"
                    selected={{
                      from: filters.dateRange?.start,
                      to: filters.dateRange?.end
                    }}
                    onSelect={(range) => {
                      handleCustomDateRange(range?.from, range?.to)
                    }}
                    numberOfMonths={1}
                    className="border-0"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Category Filter */}
          <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.categories?.length ? 'primary' : 'outline'}
                size="input"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Categories
                  {filters.categories?.length ? ` (${filters.categories.length})` : ''}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 z-[100]" align="end" side="bottom" sideOffset={8}>
              <div className="space-y-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Categories</h4>
                  {filters.categories?.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ ...filters, categories: undefined })}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={filters.categories?.includes(category.id) || false}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <label
                        htmlFor={category.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Member Filter */}
          {members.length > 1 && (
            <Popover open={memberFilterOpen} onOpenChange={setMemberFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={filters.members?.length ? 'primary' : 'outline'}
                  size="input"
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Members
                    {filters.members?.length ? ` (${filters.members.length})` : ''}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 z-[100]" align="end" side="bottom" sideOffset={8}>
                <div className="space-y-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Members</h4>
                    {filters.members?.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({ ...filters, members: undefined })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={member.user_id}
                          checked={filters.members?.includes(member.user_id) || false}
                          onCheckedChange={() => handleMemberToggle(member.user_id)}
                        />
                        <label
                          htmlFor={member.user_id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {member.user_profiles?.full_name || 'Unknown'}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Active filters:</span>
          
          {filters.type && filters.type !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.type}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleTypeChange('all')}
              />
            </Badge>
          )}
          
          {filters.dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters({ ...filters, dateRange: undefined })}
              />
            </Badge>
          )}
          
          {filters.categories?.map((categoryId) => {
            const category = categories.find(c => c.id === categoryId)
            return category ? (
              <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                {category.name}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleCategoryToggle(categoryId)}
                />
              </Badge>
            ) : null
          })}
          
          {filters.members?.map((memberId) => {
            const member = members.find(m => m.user_id === memberId)
            return member ? (
              <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                {member.user_profiles?.full_name || 'Unknown'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleMemberToggle(memberId)}
                />
              </Badge>
            ) : null
          })}
          
          {filters.searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.searchQuery}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={clearSearch}
              />
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted hover:text-primary"
          >
            Clear all ({activeFilterCount})
          </Button>
        </div>
      )}
    </div>
  )
}