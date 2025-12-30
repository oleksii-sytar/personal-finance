/**
 * Default category definitions following structure.md organization
 */

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'utensils', color: '#E6A65D' },
  { name: 'Transportation', icon: 'car', color: '#4E7A58' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#B45309' },
  { name: 'Entertainment', icon: 'film', color: '#5C3A21' },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#1C1917' },
  { name: 'Healthcare', icon: 'heart', color: '#DC2626' },
  { name: 'Education', icon: 'book', color: '#2563EB' },
  { name: 'Travel', icon: 'plane', color: '#7C3AED' },
  { name: 'Home & Garden', icon: 'home', color: '#059669' },
  { name: 'Personal Care', icon: 'user', color: '#DB2777' },
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#4E7A58' },
  { name: 'Freelance', icon: 'laptop', color: '#E6A65D' },
  { name: 'Investment', icon: 'trending-up', color: '#B45309' },
  { name: 'Business', icon: 'building', color: '#5C3A21' },
  { name: 'Other Income', icon: 'plus-circle', color: '#1C1917' },
] as const

export type DefaultExpenseCategory = typeof DEFAULT_EXPENSE_CATEGORIES[number]['name']
export type DefaultIncomeCategory = typeof DEFAULT_INCOME_CATEGORIES[number]['name']