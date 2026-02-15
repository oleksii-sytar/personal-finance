/**
 * Help text and tooltip content for user documentation
 * 
 * This file contains all user-facing help text, tooltips, and explanations
 * used throughout the Forma application.
 */

export const HELP_TEXT = {
  // Forecast & Financial Safety
  DAILY_FORECAST: {
    title: 'Daily Cash Flow Forecast',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">This chart shows your projected account balance for each day of the month.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Calculation includes:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Your current balance</li>
            <li>Completed transactions (historical)</li>
            <li>Planned transactions (scheduled)</li>
            <li>Estimated daily spending (based on last 30 days)</li>
          </ul>
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Colors indicate risk level:</p>
          <ul className="space-y-0.5 ml-2">
            <li>🟢 <span className="text-green-500">Green</span>: Safe - sufficient funds</li>
            <li>🟡 <span className="text-amber-500">Yellow</span>: Warning - balance below 7-day buffer</li>
            <li>🔴 <span className="text-red-500">Red</span>: Risk - insufficient funds projected</li>
          </ul>
        </div>
        <p className="text-xs italic text-secondary">Note: This is an estimate. Actual spending may vary.</p>
      </div>
    )
  },

  PLANNED_TRANSACTIONS: {
    title: 'Planned Transactions',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Planned transactions are future expenses or income that you expect.</p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
          <li>They do NOT affect your current balance</li>
          <li>They ARE included in forecast calculations</li>
          <li>Mark as "Paid" when the transaction occurs</li>
          <li>They will then affect your actual balance</li>
        </ul>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Use planned transactions to:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Schedule recurring bills</li>
            <li>Plan for upcoming expenses</li>
            <li>Avoid payment surprises</li>
          </ul>
        </div>
      </div>
    )
  },

  UPCOMING_PAYMENTS: {
    title: 'Upcoming Payments & Risks',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">See what payments are coming and if you're at risk.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Risk indicators:</p>
          <ul className="space-y-0.5 ml-2">
            <li>🟢 <span className="text-green-500">Safe</span>: Sufficient balance projected</li>
            <li>🟡 <span className="text-amber-500">Warning</span>: Balance will be tight</li>
            <li>🔴 <span className="text-red-500">Risk</span>: Insufficient balance projected</li>
          </ul>
        </div>
        <p className="text-xs">Payments are sorted by date (soonest first) so you can prepare accordingly.</p>
      </div>
    )
  },

  AVERAGE_DAILY_SPENDING: {
    title: 'Average Daily Spending',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Your estimated daily spending based on recent history.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Calculation:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Based on last 30 days of expenses</li>
            <li>Excludes one-time large purchases ({">"} 2x median)</li>
            <li>Applies 10% safety margin for conservative estimates</li>
          </ul>
        </div>
        <p className="text-xs italic text-secondary">
          Requires at least 14 days of transaction history for accurate calculation.
        </p>
      </div>
    )
  },

  BALANCE_OVERVIEW: {
    title: 'Balance Overview',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Your total available balance across all accounts.</p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
          <li>Shows current balance (completed transactions only)</li>
          <li>Excludes planned/future transactions</li>
          <li>Indicates accounts needing reconciliation</li>
          <li>Separates debt vs. asset accounts</li>
        </ul>
        <p className="text-xs">
          Click on an account to view details or reconcile balances.
        </p>
      </div>
    )
  },

  SPENDING_TRENDS: {
    title: 'Spending Trends',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Understand your spending patterns over time.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Shows:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Spending by category for selected month</li>
            <li>Comparison to previous month (% change)</li>
            <li>Comparison to 3-month average</li>
            <li>Unusual spending patterns highlighted</li>
          </ul>
        </div>
        <p className="text-xs">
          Use this to identify areas where you can save money.
        </p>
      </div>
    )
  },

  // Account & Transaction Management
  ACCOUNT_RECONCILIATION: {
    title: 'Account Reconciliation',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Keep your account balances accurate.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Reconciliation process:</p>
          <ol className="list-decimal list-inside space-y-0.5 ml-2">
            <li>Check your actual bank/card balance</li>
            <li>Compare with Forma's calculated balance</li>
            <li>If different, update to match actual balance</li>
            <li>Forma creates an adjustment transaction</li>
          </ol>
        </div>
        <p className="text-xs italic text-secondary">
          Reconcile regularly (weekly or monthly) to maintain accuracy.
        </p>
      </div>
    )
  },

  TRANSACTION_STATUS: {
    title: 'Transaction Status',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Transactions can be completed or planned.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">✓ Completed:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Transaction has occurred</li>
            <li>Affects your current balance</li>
            <li>Included in reconciliation</li>
          </ul>
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-medium">📅 Planned:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Future transaction (hasn't occurred yet)</li>
            <li>Does NOT affect current balance</li>
            <li>Included in forecast calculations</li>
            <li>Mark as "Paid" when it occurs</li>
          </ul>
        </div>
      </div>
    )
  },

  MONTH_NAVIGATION: {
    title: 'Month Navigation',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">View transactions and forecasts by month.</p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
          <li>Select any month to view its transactions</li>
          <li>Use arrows to navigate previous/next month</li>
          <li>Click "Today" to return to current month</li>
          <li>Transaction count shown for each month</li>
        </ul>
        <p className="text-xs">
          Forecast calculations adjust based on selected month.
        </p>
      </div>
    )
  },

  // Workspace & Settings
  WORKSPACE: {
    title: 'Workspace',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">A workspace is your financial environment.</p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
          <li>Contains all your accounts and transactions</li>
          <li>Can invite family members to collaborate</li>
          <li>Each workspace has its own settings</li>
          <li>You can have multiple workspaces</li>
        </ul>
        <p className="text-xs italic text-secondary">
          Start by creating your first workspace to begin tracking finances.
        </p>
      </div>
    )
  },

  MINIMUM_SAFE_BALANCE: {
    title: 'Minimum Safe Balance',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Set your personal safety threshold.</p>
        <p className="text-xs">
          This is the minimum amount you want to keep in your accounts. 
          The forecast will warn you when your balance is projected to fall below this amount.
        </p>
        <p className="text-xs">
          Default is ₴0, but you may want to set a higher buffer (e.g., ₴1,000) for peace of mind.
        </p>
      </div>
    )
  },

  SAFETY_BUFFER_DAYS: {
    title: 'Safety Buffer Days',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">How many days of expenses to keep as a buffer.</p>
        <p className="text-xs">
          The forecast will show a warning when your balance falls below this many days 
          of average spending.
        </p>
        <p className="text-xs">
          Default is 7 days. Increase for more conservative warnings, decrease for less.
        </p>
      </div>
    )
  },

  // Categories & Types
  CATEGORIES: {
    title: 'Categories',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Organize transactions by category.</p>
        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
          <li>Default categories created automatically</li>
          <li>Create custom categories for your needs</li>
          <li>Used for spending analysis and reports</li>
          <li>Can be edited or deleted anytime</li>
        </ul>
        <p className="text-xs">
          Good categorization helps you understand spending patterns.
        </p>
      </div>
    )
  },

  ACCOUNT_TYPES: {
    title: 'Account Types',
    content: (
      <div className="space-y-2">
        <p className="font-semibold">Different types of accounts for different purposes.</p>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Asset Accounts:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Cash: Physical cash on hand</li>
            <li>Checking: Bank checking account</li>
            <li>Savings: Savings account</li>
            <li>Investment: Investment accounts</li>
          </ul>
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-medium">Debt Accounts:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Credit Card: Credit card balances</li>
            <li>Loan: Personal or other loans</li>
          </ul>
        </div>
      </div>
    )
  }
} as const

// Short inline help text (for labels, placeholders, etc.)
export const INLINE_HELP = {
  TRANSACTION_AMOUNT: 'Enter the transaction amount in your account currency',
  TRANSACTION_DESCRIPTION: 'Brief description of the transaction (e.g., "Grocery shopping")',
  TRANSACTION_DATE: 'Date when the transaction occurred or will occur',
  FUTURE_DATE_INFO: 'Future dates create planned transactions (won\'t affect current balance)',
  ACCOUNT_NAME: 'Give your account a recognizable name (e.g., "Main Checking")',
  ACCOUNT_INITIAL_BALANCE: 'Current balance in this account (check your bank statement)',
  CATEGORY_NAME: 'Name for this category (e.g., "Groceries", "Utilities")',
  WORKSPACE_NAME: 'Name for your workspace (e.g., "Family Budget", "Personal")',
  MINIMUM_SAFE_BALANCE_HINT: 'Minimum amount you want to keep available (default: ₴0)',
  SAFETY_BUFFER_HINT: 'Number of days of expenses to keep as buffer (default: 7 days)'
} as const

// FAQ content
export const FAQ_ITEMS = [
  {
    question: 'How accurate is the daily forecast?',
    answer: 'The forecast is based on your historical spending patterns and scheduled transactions. It becomes more accurate as you add more transaction history. We apply a 10% safety margin to be conservative. Actual spending may vary based on unexpected expenses or changes in behavior.'
  },
  {
    question: 'Why do planned transactions not affect my current balance?',
    answer: 'Planned transactions represent future expenses or income that haven\'t occurred yet. They don\'t affect your current balance because the money hasn\'t actually moved. Once you mark them as "Paid", they become completed transactions and affect your balance.'
  },
  {
    question: 'What does "insufficient data" mean?',
    answer: 'The forecast requires at least 14 days of transaction history to calculate accurate spending patterns. If you see this message, add more transactions to improve forecast accuracy.'
  },
  {
    question: 'How often should I reconcile my accounts?',
    answer: 'We recommend reconciling at least once a week, or whenever you notice a discrepancy between Forma\'s balance and your actual bank balance. Regular reconciliation ensures your forecasts are based on accurate data.'
  },
  {
    question: 'Can I change my safety buffer settings?',
    answer: 'Yes! Go to Settings → Forecast Preferences to adjust your minimum safe balance and safety buffer days. These settings control when you see warnings in the forecast.'
  },
  {
    question: 'What happens when I mark a planned transaction as paid?',
    answer: 'When you mark a planned transaction as paid, it converts to a completed transaction. This means it will now affect your actual account balance and be included in reconciliation calculations.'
  },
  {
    question: 'Why are some days marked as "risk" in the forecast?',
    answer: 'Risk days are when your projected balance falls below zero or below your safety buffer. This helps you identify potential cash flow problems before they happen, so you can plan accordingly.'
  },
  {
    question: 'How far ahead can I plan transactions?',
    answer: 'You can plan transactions up to 6 months in advance. This helps you prepare for upcoming bills, subscriptions, and other expected expenses.'
  },
  {
    question: 'What are the colored indicators in upcoming payments?',
    answer: '🟢 Green means you have sufficient funds for the payment. 🟡 Yellow means your balance will be tight after the payment. 🔴 Red means you may not have enough funds and should take action.'
  },
  {
    question: 'Can I export my transaction data?',
    answer: 'Export functionality is planned for a future update. For now, you can view and manage all your transactions within Forma.'
  }
] as const
