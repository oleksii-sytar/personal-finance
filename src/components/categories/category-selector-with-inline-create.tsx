'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCategoriesByUsage } from '@/hooks/use-categories'
import { useWorkspace } from '@/contexts/workspace-context'
import { InlineCategoryCreator } from './inline-category-creator'
import type { Category } from '@/types'
import type { TransactionType } from '@/types/transactions'

interface CategorySelectorWithInlineCreateProps {
  type: TransactionType
  value?: string
  onChange: (categoryId: string | undefined) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

/**
 * CategorySelectorWithInlineCreate component for category selection with inline creation
 * Implements Requirement 7.1: Category management accessible from transaction entry (inline)
 * Combines category selection with the ability to create new categories on the fly
 */
export function CategorySelectorWithInlineCreate({
  type,
  value,
  onChange,
  placeholder = "Search or create category...",
  className,
  autoFocus
}: CategorySelectorWithInlineCreateProps) {
  const { currentWorkspace } = useWorkspace()
  const { data: categories = [] } = useCategoriesByUsage(currentWorkspace?.id || '', type)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Find selected category
  const selectedCategory = categories.find(cat => cat.id === value)

  // Update search term when selected category changes
  useEffect(() => {
    if (selectedCategory && !showDropdown) {
      setSearchTerm(selectedCategory.name)
    }
  }, [selectedCategory, showDropdown])

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
    if (selectedCategory) {
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
      setShowCreateForm(false)
      
      // Restore selected category name if no new selection
      if (selectedCategory && !value) {
        setSearchTerm(selectedCategory.name)
      } else if (!value) {
        setSearchTerm('')
      }
    }, 150)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    const totalOptions = filteredCategories.length + (searchTerm && filteredCategories.length === 0 ? 1 : 0)

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
        if (selectedIndex >= 0 && selectedIndex < filteredCategories.length) {
          handleCategorySelect(filteredCategories[selectedIndex])
        } else if (searchTerm && filteredCategories.length === 0) {
          // Create new category
          setShowCreateForm(true)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setShowCreateForm(false)
        inputRef.current?.blur()
        break
    }
  }

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    onChange(category.id)
    setSearchTerm(category.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  // Handle new category creation
  const handleCategoryCreated = (category: Category) => {
    onChange(category.id)
    setSearchTerm(category.name)
    setShowCreateForm(false)
    setShowDropdown(false)
  }

  // Handle create form cancel
  const handleCreateCancel = () => {
    setShowCreateForm(false)
    inputRef.current?.focus()
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
      />

      {/* Dropdown */}
      {showDropdown && !showCreateForm && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-glass-interactive border border-glass rounded-xl shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Existing Categories */}
          {filteredCategories.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category)}
              className={`w-full p-3 text-left hover:bg-ambient-glow transition-colors flex items-center gap-2 ${
                index === selectedIndex ? 'bg-ambient-glow' : ''
              }`}
            >
              {category.icon && <span className="text-lg">{category.icon}</span>}
              <div
                className="w-3 h-3 rounded-full border border-glass"
                style={{ backgroundColor: category.color || '#8B7355' }}
              />
              <span className="text-primary font-medium">{category.name}</span>
              {category.usage_count > 0 && (
                <span className="text-xs text-secondary ml-auto">
                  {category.usage_count}
                </span>
              )}
              {category.is_default && (
                <span className="text-xs text-secondary">(Default)</span>
              )}
            </button>
          ))}

          {/* Create New Category Option */}
          {searchTerm && filteredCategories.length === 0 && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className={`w-full p-3 text-left hover:bg-ambient-glow transition-colors flex items-center gap-2 ${
                selectedIndex === filteredCategories.length ? 'bg-ambient-glow' : ''
              }`}
            >
              <span className="text-accent-primary">+</span>
              <span className="text-primary">
                Create "{searchTerm}"
              </span>
            </button>
          )}

          {/* No Results */}
          {!searchTerm && filteredCategories.length === 0 && (
            <div className="p-3 text-secondary text-sm">
              No categories yet. Start typing to create one.
            </div>
          )}

          {/* Recent Categories Header */}
          {!searchTerm && filteredCategories.length > 0 && (
            <div className="px-3 py-2 text-xs text-secondary border-b border-glass">
              Recent & Frequent
            </div>
          )}
        </div>
      )}

      {/* Inline Create Form */}
      {showCreateForm && (
        <div className="absolute z-20 w-full mt-1">
          <InlineCategoryCreator
            type={type}
            onCategoryCreated={handleCategoryCreated}
            onCancel={handleCreateCancel}
          />
        </div>
      )}
    </div>
  )
}