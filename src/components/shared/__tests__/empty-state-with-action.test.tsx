import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wallet } from 'lucide-react'
import { EmptyStateWithAction } from '../empty-state-with-action'

describe('EmptyStateWithAction', () => {
  it('renders title and description', () => {
    render(
      <EmptyStateWithAction
        icon={Wallet}
        title="No Data"
        description="Add some data to get started"
      />
    )

    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByText('Add some data to get started')).toBeInTheDocument()
  })

  it('renders guidance when provided', () => {
    render(
      <EmptyStateWithAction
        icon={Wallet}
        title="No Data"
        description="Add some data"
        guidance="This is helpful guidance"
      />
    )

    expect(screen.getByText(/This is helpful guidance/)).toBeInTheDocument()
  })

  it('renders action button with link', () => {
    render(
      <EmptyStateWithAction
        icon={Wallet}
        title="No Data"
        description="Add some data"
        action={{
          label: "Add Now",
          href: "/add"
        }}
      />
    )

    const button = screen.getByRole('button', { name: 'Add Now' })
    expect(button).toBeInTheDocument()
  })

  it('renders without action button', () => {
    render(
      <EmptyStateWithAction
        icon={Wallet}
        title="No Data"
        description="Add some data"
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
