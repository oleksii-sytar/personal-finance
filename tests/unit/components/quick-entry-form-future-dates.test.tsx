import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuickEntryForm } from '@/components/transactions/quick-entry-form'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { TransactionFilterProvider } from '@/contexts/transaction-filter-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
vi.mock('@/hooks/use-transactions', () => ({
  useCreateTransaction: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ data: { id: '1' } }),
  }),
}))

vi.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({
    data: [],
  }),
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

describe('QuickEntryForm - Future Dates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should default to today\'s date with completed status', () => {
    renderWithProviders(<QuickEntryForm />)
    
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]) as HTMLInputElement
    const today = new Date().toISOString().split('T')[0]
    
    expect(dateInput.value).toBe(today)
    expect(dateInput.type).toBe('date')
    // Should not show planned indicator for today
    expect(screen.queryByText('Planned Transaction')).not.toBeInTheDocument()
  })

  it('should show planned indicator when future date is selected', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    fireEvent.change(dateInput, { target: { value: futureDateStr } })
    
    await waitFor(() => {
      expect(screen.getByText('Planned Transaction')).toBeInTheDocument()
    })
  })

  it('should show explanatory text for planned transactions', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    
    fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } })
    
    await waitFor(() => {
      expect(screen.getByText(/scheduled for the future.*won't affect your current balance/i)).toBeInTheDocument()
    })
  })

  it('should not show planned indicator for today or past dates', () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Today's date (default)
    expect(screen.queryByText('Planned Transaction')).not.toBeInTheDocument()
    
    // Past date
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    fireEvent.change(dateInput, { target: { value: pastDate.toISOString().split('T')[0] } })
    
    expect(screen.queryByText('Planned Transaction')).not.toBeInTheDocument()
  })

  it('should enforce max date of 6 months ahead', () => {
    renderWithProviders(<QuickEntryForm />)
    
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]) as HTMLInputElement
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 6)
    const maxDateStr = maxDate.toISOString().split('T')[0]
    
    expect(dateInput.max).toBe(maxDateStr)
  })

  it('should include status and planned_date in submission for future dates', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: '1' } })
    vi.mocked(await import('@/hooks/use-transactions')).useCreateTransaction = () => ({
      mutateAsync: mockMutateAsync,
    }) as any

    renderWithProviders(<QuickEntryForm />)
    
    // Fill in amount
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '50' } })
    
    // Set future date
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    fireEvent.change(dateInput, { target: { value: futureDateStr } })
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
      const formData = mockMutateAsync.mock.calls[0][0] as FormData
      expect(formData.get('status')).toBe('planned')
      expect(formData.get('planned_date')).toBe(futureDateStr)
    })
  })

  it('should include status as completed for today', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: '1' } })
    vi.mocked(await import('@/hooks/use-transactions')).useCreateTransaction = () => ({
      mutateAsync: mockMutateAsync,
    }) as any

    renderWithProviders(<QuickEntryForm />)
    
    // Fill in amount (date defaults to today)
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '75' } })
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
      const formData = mockMutateAsync.mock.calls[0][0] as FormData
      expect(formData.get('status')).toBe('completed')
      expect(formData.get('planned_date')).toBeNull()
    })
  })

  it('should reset to completed status after successful submission', async () => {
    renderWithProviders(<QuickEntryForm />)
    
    // Set future date
    const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2)
    fireEvent.change(dateInput, { target: { value: futureDate.toISOString().split('T')[0] } })
    
    await waitFor(() => {
      expect(screen.getByText('Planned Transaction')).toBeInTheDocument()
    })
    
    // Fill and submit
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    fireEvent.click(submitButton)
    
    // After submission, should reset to today (completed)
    await waitFor(() => {
      const resetDateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]) as HTMLInputElement
      const today = new Date().toISOString().split('T')[0]
      expect(resetDateInput.value).toBe(today)
      expect(screen.queryByText('Planned Transaction')).not.toBeInTheDocument()
    })
  })
})
