'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AccountTypeIcon } from './account-type-icon'
import { getAccounts } from '@/actions/accounts'
import type { Account } from '@/actions/accounts'

interface AccountSelectorProps {
  /**
   * The currently selected account ID
   */
  value?: string
  
  /**
   * Callback when account selection changes
   */
  onChange: (accountId: string | undefined) => void
  
  /**
   * Optional placeholder text
   */
  placeholder?: string
  
  /**
   * Optional additional CSS classes
   */
  className?: string
  
  /**
   * Whether to auto-focus the input
   */
  autoFocus?: boolean
}

/**
 * AccountSelector component for selecting accounts in transaction forms
 * 
 * Features:
 * - Fetches accounts for workspace using getAccounts()
 * - Displays account name + type icon in dropdown
 * - Shows "Default" badge for default account (first created)
 * - Implements keyboard navigation support (Arrow keys, Enter, Escape)
 * - Mobile-optimized touch targets (min 44px)
 * - Handles loading and error states
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function AccountSelector({
  value,
  onChange,
  placeholder = "Select account...",
  className,
  autoFocus
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch accounts on mount and when accounts change
  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true)
      setError(null)
      
      try {
        const result = await getAccounts()
        
        if (result.error) {
          setError(typeof result.error === 'string' ? result.error : 'Failed to load accounts')
        } else {
          setAccounts(result.data || [])
        }
      } catch (err) {
        setError('Failed to load accounts')
        console.error('Account fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchAccounts()

    // Refetch accounts when they change (e.g., new account created)
    const handleAccountsChanged = () => {
      fetchAccounts()
    }

    window.addEventListener('accountsChanged', handleAccountsChanged)

    return () => {
      window.removeEventListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Find selected account
  const selectedAccount = accounts.find(acc => acc.id === value)
  
  // Determine default account (first created account)
  const defaultAccount = accounts.length > 0 ? accounts[0] : null

  // Update search term when selected account changes
  useEffect(() => {
    if (selectedAccount && !showDropdown) {
      setSearchTerm(selectedAccount.name)
    }
  }, [selectedAccount, showDropdown])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value
    setSearchTerm(newSearchTerm)
    setShowDropdown(true)
    setSelectedIndex(-1)
    
    // Clear selection if user is typing
    if (value) {
      onChange(undefined)
    }
  }

  // Handle input focus
  const handleInputFocus = () => {
    setShowDropdown(true)
    if (selectedAccount) {
      setSearchTerm('')
    }
  }

  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't hide dropdown if clicking inside it
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    
    setTimeout(() => {
      setShowDropdown(false)
      
      // Restore selected account name if no new selection
      if (selectedAccount && !value) {
        setSearchTerm(selectedAccount.name)
      } else if (!value) {
        setSearchTerm('')
      }
    }, 150)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    const totalOptions = filteredAccounts.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => prev < totalOptions - 1 ? prev + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : totalOptions - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredAccounts.length) {
          handleAccountSelect(filteredAccounts[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        inputRef.current?.blur()
        break
    }
  }

  // Handle account selection
  const handleAccountSelect = (account: Account) => {
    onChange(account.id)
    setSearchTerm(account.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <div className="p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg text-accent-error text-sm">
          {error}
        </div>
      </div>
    )
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className={className}>
        <div className="p-3 bg-glass border border-glass rounded-lg text-secondary text-sm">
          No accounts found. Create an account first.
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className="w-full"
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label="Select account"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        role="combobox"
      />

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute z-10 w-full mt-1 bg-glass-dropdown backdrop-blur-xl border border-glass rounded-xl shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Filtered Accounts */}
          {filteredAccounts.map((account, index) => {
            const isDefault = defaultAccount?.id === account.id
            
            return (
              <button
                key={account.id}
                type="button"
                role="option"
                aria-selected={account.id === value}
                onClick={() => handleAccountSelect(account)}
                className={`w-full p-3 text-left transition-all duration-200 ease-out flex items-center gap-3 rounded-lg group min-h-[44px]
                  hover:bg-accent-primary/10 hover:border-accent-primary/20 hover:shadow-sm
                  focus:bg-accent-primary/10 focus:border-accent-primary/20 focus:outline-none focus:ring-2 focus:ring-accent-primary/20
                  ${index === selectedIndex ? 'bg-accent-primary/15 border-accent-primary/30 shadow-sm' : 'border border-transparent'}
                  ${account.id === value ? 'bg-accent-primary/10' : ''}
                `}
              >
                {/* Account Type Icon */}
                <AccountTypeIcon 
                  type={account.type} 
                  className="w-5 h-5 flex-shrink-0 transition-all duration-200 group-hover:brightness-125" 
                />
                
                {/* Account Name */}
                <span className="text-primary font-medium transition-colors duration-200 group-hover:text-accent-primary flex-1">
                  {account.name}
                </span>
                
                {/* Default Badge */}
                {isDefault && (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-accent-primary/10 border-accent-primary/30 text-accent-primary"
                  >
                    Default
                  </Badge>
                )}
              </button>
            )
          })}

          {/* No Results */}
          {searchTerm && filteredAccounts.length === 0 && (
            <div className="p-3 text-secondary text-sm">
              No accounts found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
