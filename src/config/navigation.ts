/**
 * Navigation configuration following structure.md patterns
 */

export interface NavItem {
  title: string
  href: string
  icon: string
  description?: string
  disabled?: boolean
  external?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/**
 * Main navigation items for authenticated users
 */
export const mainNav: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'layout-dashboard',
    description: 'Overview of your financial status',
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: 'receipt',
    description: 'Manage your income and expenses',
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: 'tag',
    description: 'Organize your spending categories',
  },
  {
    title: 'Accounts',
    href: '/accounts',
    icon: 'credit-card',
    description: 'Manage your bank accounts and cards',
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: 'bar-chart-3',
    description: 'Analyze your financial patterns',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: 'settings',
    description: 'Configure your preferences',
  },
]

/**
 * Sidebar navigation sections
 */
export const sidebarNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: 'layout-dashboard',
      },
    ],
  },
  {
    title: 'Transactions',
    items: [
      {
        title: 'All Transactions',
        href: '/transactions',
        icon: 'receipt',
      },
      {
        title: 'Add Transaction',
        href: '/transactions/new',
        icon: 'plus',
      },
      {
        title: 'Categories',
        href: '/categories',
        icon: 'tag',
      },
    ],
  },
  {
    title: 'Accounts',
    items: [
      {
        title: 'All Accounts',
        href: '/accounts',
        icon: 'credit-card',
      },
      {
        title: 'Add Account',
        href: '/accounts/new',
        icon: 'plus',
      },
    ],
  },
  {
    title: 'Analysis',
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: 'bar-chart-3',
      },
      {
        title: 'Budget',
        href: '/budget',
        icon: 'target',
        disabled: true, // Feature flag controlled
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'Preferences',
        href: '/settings',
        icon: 'settings',
      },
      {
        title: 'Profile',
        href: '/settings/profile',
        icon: 'user',
      },
    ],
  },
]

/**
 * Footer navigation links
 */
export const footerNav: NavItem[] = [
  {
    title: 'Privacy Policy',
    href: '/privacy',
    icon: 'shield',
  },
  {
    title: 'Terms of Service',
    href: '/terms',
    icon: 'file-text',
  },
  {
    title: 'Support',
    href: '/support',
    icon: 'help-circle',
  },
]