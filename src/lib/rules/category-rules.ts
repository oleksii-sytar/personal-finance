import type { CategoryRule } from '@/types/domain'

export interface RuleMatchInput {
  description: string
  notes?: string | null
  accountId: string
  kind: 'income' | 'expense' | 'transfer'
  amount: number
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

export function parseRuleTokens(raw: string): string[] {
  return normalize(raw)
    .split(/[;,|]/g)
    .map((token) => token.trim())
    .filter(Boolean)
}

function matchesDescription(rule: CategoryRule, input: RuleMatchInput): boolean {
  const tokens = parseRuleTokens(rule.descriptionContains)
  if (!tokens.length) return false
  const haystack = normalize(`${input.description} ${input.notes ?? ''}`)
  return tokens.some((token) => haystack.includes(token))
}

function matchesKind(rule: CategoryRule, input: RuleMatchInput): boolean {
  return !rule.kind || rule.kind === input.kind
}

function matchesAmount(rule: CategoryRule, input: RuleMatchInput): boolean {
  if (rule.minAmount != null && input.amount < rule.minAmount) return false
  if (rule.maxAmount != null && input.amount > rule.maxAmount) return false
  return true
}

function matchesAccount(rule: CategoryRule, input: RuleMatchInput): boolean {
  return !rule.accountId || rule.accountId === input.accountId
}

export function matchesRule(rule: CategoryRule, input: RuleMatchInput): boolean {
  if (!rule.isActive) return false
  if (rule.categoryId.trim().length === 0) return false
  if (rule.descriptionContains.trim().length === 0) return false
  if (!matchesDescription(rule, input)) return false
  if (!matchesKind(rule, input)) return false
  if (!matchesAmount(rule, input)) return false
  if (!matchesAccount(rule, input)) return false
  return true
}

export function findMatchingCategoryRule(
  rules: CategoryRule[],
  input: RuleMatchInput
): CategoryRule | undefined {
  const match = rules
    .filter((rule) => matchesRule(rule, input))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })[0]
  return match
}