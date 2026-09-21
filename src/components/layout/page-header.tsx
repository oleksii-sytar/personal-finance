interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-space-grotesk text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto [&>a]:max-w-full">{action}</div>}
    </div>
  )
}