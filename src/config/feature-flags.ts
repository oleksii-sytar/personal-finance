/**
 * Feature flags configuration following feature-flags.md patterns
 */

export const FEATURE_FLAGS = {
  // Core features
  MULTI_CURRENCY: process.env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY === 'true',
  RECURRING_TRANSACTIONS: process.env.NEXT_PUBLIC_FEATURE_RECURRING === 'true',
  FORECASTING: process.env.NEXT_PUBLIC_FEATURE_FORECASTING === 'true',
  GOAL_SETTING: process.env.NEXT_PUBLIC_FEATURE_GOALS === 'true',
  DEBT_SNOWBALL: process.env.NEXT_PUBLIC_FEATURE_DEBT_SNOWBALL === 'true',
  
  // User Journey Enhancement features
  FUTURE_TRANSACTIONS: process.env.NEXT_PUBLIC_FEATURE_FUTURE_TRANSACTIONS === 'true',
  DAILY_FORECAST: process.env.NEXT_PUBLIC_FEATURE_DAILY_FORECAST === 'true',
  PAYMENT_RISKS: process.env.NEXT_PUBLIC_FEATURE_PAYMENT_RISKS === 'true',
  
  // Experimental features
  AI_CATEGORIZATION: process.env.NEXT_PUBLIC_FEATURE_AI_CATEGORIZATION === 'true',
  BANK_IMPORT: process.env.NEXT_PUBLIC_FEATURE_BANK_IMPORT === 'true',
  BULK_OPERATIONS: process.env.NEXT_PUBLIC_FEATURE_BULK_OPERATIONS === 'true',
  
  // Infrastructure
  REALTIME_SYNC: process.env.NEXT_PUBLIC_FEATURE_REALTIME === 'true',
  ADVANCED_CHARTS: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_CHARTS === 'true',
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Checks if a feature flag is enabled
 * 
 * @param flag - Feature flag to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false
}

/**
 * Gets all enabled features
 * 
 * @returns Array of enabled feature flag names
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag as FeatureFlag)
}

/**
 * Feature flag metadata for UI display
 */
export const FEATURE_METADATA: Record<FeatureFlag, {
  name: string
  description: string
  availableIn?: string
}> = {
  MULTI_CURRENCY: {
    name: 'Multi-Currency Support',
    description: 'Support for multiple currencies with automatic conversion',
  },
  RECURRING_TRANSACTIONS: {
    name: 'Recurring Transactions',
    description: 'Set up automatic recurring income and expenses',
  },
  FORECASTING: {
    name: 'Balance Forecasting',
    description: 'Predict future account balances based on patterns',
    availableIn: 'v1.2',
  },
  GOAL_SETTING: {
    name: 'Financial Goals',
    description: 'Set and track financial goals and milestones',
    availableIn: 'v1.3',
  },
  DEBT_SNOWBALL: {
    name: 'Debt Payoff Strategy',
    description: 'Systematic debt elimination using snowball method',
    availableIn: 'v1.4',
  },
  FUTURE_TRANSACTIONS: {
    name: 'Future Transactions',
    description: 'Plan and schedule future transactions without affecting current balance',
  },
  DAILY_FORECAST: {
    name: 'Daily Cash Flow Forecast',
    description: 'See projected daily balances to avoid running out of money',
  },
  PAYMENT_RISKS: {
    name: 'Payment Risk Assessment',
    description: 'Get warnings about upcoming payments that may cause insufficient funds',
  },
  AI_CATEGORIZATION: {
    name: 'AI Transaction Categorization',
    description: 'Automatically categorize transactions using AI',
    availableIn: 'v2.0',
  },
  BANK_IMPORT: {
    name: 'Bank Statement Import',
    description: 'Import transactions from bank statements',
    availableIn: 'v2.0',
  },
  BULK_OPERATIONS: {
    name: 'Bulk Operations',
    description: 'Perform operations on multiple transactions at once',
  },
  REALTIME_SYNC: {
    name: 'Real-time Sync',
    description: 'Real-time updates across multiple devices',
    availableIn: 'v1.5',
  },
  ADVANCED_CHARTS: {
    name: 'Advanced Charts',
    description: 'Interactive charts and advanced visualizations',
    availableIn: 'v1.3',
  },
}