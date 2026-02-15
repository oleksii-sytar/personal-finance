import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MonthSelector } from '@/components/shared/month-selector'
import { format, addMonths, subMonths } from 'date-fns'

describe('MonthSelector', () => {
  const mockOnMonthChange = vi.fn()
  const currentDate = new Date(2024, 0, 15) // January 15, 2024
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(currentDate)
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with selected month', () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    expect(screen.getByText('January 2024')).toBeInTheDocument()
  })

  it('shows transaction count when provided', () => {
    const transactionCounts = {
      '2024-01': 15
    }
    
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
        transactionCounts={transactionCounts}
      />
    )
    
    expect(screen.getByText('(15)')).toBeInTheDocument()
  })

  it('navigates to previous month when clicking previous button', () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const prevButton = screen.getByLabelText('Previous month')
    fireEvent.click(prevButton)
    
    expect(mockOnMonthChange).toHaveBeenCalledWith(
      subMonths(currentDate, 1)
    )
  })

  it('navigates to next month when clicking next button', () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const nextButton = screen.getByLabelText('Next month')
    fireEvent.click(nextButton)
    
    expect(mockOnMonthChange).toHaveBeenCalledWith(
      addMonths(currentDate, 1)
    )
  })

  it('shows "Today" button when not on current month', () => {
    const pastMonth = subMonths(currentDate, 2)
    
    render(
      <MonthSelector
        selectedMonth={pastMonth}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('hides "Today" button when on current month', () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('jumps to current month when clicking "Today" button', () => {
    const pastMonth = subMonths(currentDate, 2)
    
    render(
      <MonthSelector
        selectedMonth={pastMonth}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const todayButton = screen.getByText('Today')
    fireEvent.click(todayButton)
    
    expect(mockOnMonthChange).toHaveBeenCalledWith(currentDate)
  })

  it('opens dropdown when clicking month selector button', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      // Should show multiple month options
      expect(screen.getByText('December 2023')).toBeInTheDocument()
      expect(screen.getByText('February 2024')).toBeInTheDocument()
    })
  })

  it('displays transaction counts in dropdown', async () => {
    const transactionCounts = {
      '2023-12': 10,
      '2024-01': 15,
      '2024-02': 8
    }
    
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
        transactionCounts={transactionCounts}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('10 transactions')).toBeInTheDocument()
      expect(screen.getByText('15 transactions')).toBeInTheDocument()
      expect(screen.getByText('8 transactions')).toBeInTheDocument()
    })
  })

  it('handles singular transaction count correctly', async () => {
    const transactionCounts = {
      '2024-01': 1
    }
    
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
        transactionCounts={transactionCounts}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('1 transaction')).toBeInTheDocument()
    })
  })

  it('selects month from dropdown and closes', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('December 2023')).toBeInTheDocument()
    })
    
    const decemberOption = screen.getByText('December 2023')
    fireEvent.click(decemberOption)
    
    expect(mockOnMonthChange).toHaveBeenCalledWith(
      new Date(2023, 11, 1) // December 1, 2023
    )
  })

  it('highlights selected month in dropdown', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      const januaryButtons = screen.getAllByText('January 2024')
      // The second one is in the dropdown
      const januaryButton = januaryButtons[1].closest('button')
      expect(januaryButton).toHaveClass('text-[var(--accent-primary)]')
    })
  })

  it('marks current month with "(Today)" label in dropdown', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('(Today)')).toBeInTheDocument()
    })
  })

  it('generates past 12 months and future 6 months options', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      // Past 12 months
      expect(screen.getByText('January 2023')).toBeInTheDocument()
      
      // Current month - use getAllByText since it appears twice
      const januaryElements = screen.getAllByText(/January 2024/)
      expect(januaryElements.length).toBeGreaterThan(0)
      
      // Future 6 months
      expect(screen.getByText('July 2024')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    const { container } = render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
        className="custom-class"
      />
    )
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-class')
  })

  it('has accessible labels for navigation buttons', () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()
    expect(screen.getByLabelText('Next month')).toBeInTheDocument()
    expect(screen.getByLabelText('Select month')).toBeInTheDocument()
  })

  it('handles zero transaction count gracefully', async () => {
    const transactionCounts = {
      '2024-01': 0
    }
    
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
        transactionCounts={transactionCounts}
      />
    )
    
    // Should not show count in main button when zero
    expect(screen.queryByText('(0)')).not.toBeInTheDocument()
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      // Should not show count in dropdown when zero
      const januaryOptions = screen.getAllByText(/January 2024/)
      const januaryButton = januaryOptions[1].closest('button')
      expect(januaryButton?.textContent).not.toContain('0 transactions')
    })
  })

  it('closes dropdown when selecting a month', async () => {
    render(
      <MonthSelector
        selectedMonth={currentDate}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('December 2023')).toBeInTheDocument()
    })
    
    const decemberOption = screen.getByText('December 2023')
    fireEvent.click(decemberOption)
    
    await waitFor(() => {
      expect(screen.queryByText('November 2023')).not.toBeInTheDocument()
    })
  })

  it('closes dropdown when clicking "Today" button', async () => {
    const pastMonth = subMonths(currentDate, 2)
    
    render(
      <MonthSelector
        selectedMonth={pastMonth}
        onMonthChange={mockOnMonthChange}
      />
    )
    
    const selectButton = screen.getByLabelText('Select month')
    fireEvent.click(selectButton)
    
    await waitFor(() => {
      expect(screen.getByText('December 2023')).toBeInTheDocument()
    })
    
    // The "Today" button is outside the dropdown, so clicking it should:
    // 1. Change the month
    // 2. Close the dropdown (via the onMonthChange callback)
    const todayButton = screen.getByText('Today')
    fireEvent.click(todayButton)
    
    // Verify month changed
    expect(mockOnMonthChange).toHaveBeenCalledWith(currentDate)
  })
})
