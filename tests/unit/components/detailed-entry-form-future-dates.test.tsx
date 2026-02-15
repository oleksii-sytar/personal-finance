import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DetailedEntryForm } from '@/components/transactions/detailed-entry-form'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { TransactionFilterProvider } from '@/contexts/transaction-filter-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks and actions
vi.mock('@/hooks/use-transactions', () => ({
  useCreateTransaction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ data: { id: '1' } }),
  }),
  useUpdateTransaction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ data: { id: '1' } }),
  }),
}))

vi.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    data: [],
  }),
}))

vi.mock('@/actions/recurring-transactions', () => ({
  createRecurringTransaction: vi.fn().mockResolvedValue({ data: { id: '1' } }),
}))

vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: () => ({
    currentWorkspace: {
      id: 'workspace-1',
      name: 'Test Workspace',
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock components
vi.mock('@/components/categories', () => ({
  CategorySelectorWithInlineCreate: ({ value, onChange }: any) => (
    <select
      data-testid="category-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select category</option>
      <option value="cat-1">Category 1</option>
    </select>
  ),
}))

vi.mock('@/components/accounts', () => ({
  AccountSelector: ({ value, onChange }: any) => (
    <select
      data-testid="account-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select account</option>
      <option value="acc-1">Account 1</option>
    </select>
  ),
}))

vi.mock('@/components/shared/currency-selector', () => ({
  CurrencySelector: ({ value, onChange }: any) => (
    <select
      data-testid="currency-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="UAH">UAH</option>
      <option value="USD">USD</option>
    </select>
  ),
}))

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  owner_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
}

// Mock AuthProvider
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionFilterProvider>
        {ui}
      </TransactionFilterProvider>
    </QueryClientProvider>
  )
}

describe('DetailedEntryForm - Future Dates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should default to completed status for today\'s date', () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
    const today = new Date().toISOString().split('T')[0]
    
    expect(dateInput.value).toBe(today)
    expect(screen.getByText('Completed Transaction')).toBeInTheDocument()
  })

  it('should auto-detect planned status when future date is selected', async () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    fireEvent.change(dateInput, { target: { value: tomorrowStr } })
    
    await waitFor(() => {
      expect(screen.getByText('Planned Transaction')).toBeInTheDocument()
    })
  })

  it('should show explanatory text for planned transactions', async () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    fireEvent.change(dateInput, { target: { value: futureDateStr } })
    
    await waitFor(() => {
      expect(screen.getByText(/are scheduled for the future and won't affect your current balance/i)).toBeInTheDocument()
    })
  })

  it('should show explanatory text for completed transactions', () => {
    renderWithProviders(<DetailedEntryForm />)
    
    expect(screen.getByText(/affect your current balance immediately/i)).toBeInTheDocument()
  })

  it('should enforce max date of 6 months ahead', () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 6)
    const maxDateStr = maxDate.toISOString().split('T')[0]
    
    expect(dateInput.max).toBe(maxDateStr)
  })

  it('should switch from planned to completed when date changes to past', async () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i)
    
    // Set to future date first
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } })
    
    await waitFor(() => {
      expect(screen.getByText('Planned Transaction')).toBeInTheDocument()
    })
    
    // Change to past date
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    fireEvent.change(dateInput, { target: { value: pastDate.toISOString().split('T')[0] } })
    
    await waitFor(() => {
      expect(screen.getByText('Completed Transaction')).toBeInTheDocument()
    })
  })

  it('should show amber indicator for planned transactions', async () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const dateInput = screen.getByLabelText(/date/i)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    
    fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } })
    
    await waitFor(() => {
      const indicator = screen.getByText('Planned Transaction').closest('div')
      expect(indicator).toHaveClass('bg-amber-500/10')
      expect(indicator).toHaveClass('text-amber-500')
    })
  })

  it('should show green indicator for completed transactions', () => {
    renderWithProviders(<DetailedEntryForm />)
    
    const indicator = screen.getByText('Completed Transaction').closest('div')
    expect(indicator).toHaveClass('bg-accent-success/10')
    expect(indicator).toHaveClass('text-accent-success')
  })

  it('should include status and planned_date in form submission for future transactions', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: '1' } })
    vi.mocked(await import('@/hooks/use-transactions')).useCreateTransaction = () => ({
      mutateAsync: mockMutateAsync,
    }) as any

    renderWithProviders(<DetailedEntryForm />)
    
    // Fill in form
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    // Set future date
    const dateInput = screen.getByLabelText(/date/i)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    fireEvent.change(dateInput, { target: { value: futureDateStr } })
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
      const formData = mockMutateAsync.mock.calls[0][0] as FormData
      expect(formData.get('status')).toBe('planned')
      expect(formData.get('planned_date')).toBe(futureDateStr)
    })
  })

  it('should include status as completed for past/today transactions', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: '1' } })
    vi.mocked(await import('@/hooks/use-transactions')).useCreateTransaction = () => ({
      mutateAsync: mockMutateAsync,
    }) as any

    renderWithProviders(<DetailedEntryForm />)
    
    // Fill in form with today's date (default)
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
      const formData = mockMutateAsync.mock.calls[0][0] as FormData
      expect(formData.get('status')).toBe('completed')
      expect(formData.get('planned_date')).toBeNull()
    })
  })
})
