# Forma - Product Definition

## Project Codename
VZ

## Product Overview

Forma is a **personal finance management (PFM) application** designed specifically for **families with children**. Unlike traditional PFM tools that optimize for individual users, Forma acknowledges the complexity of household finances — multiple earners, multiple spenders, shared obligations, and the need for regular financial reconciliation as a family unit.

Forma replaces spreadsheets, scattered bank apps, and mental accounting with a unified, premium-quality experience that brings structure and discipline to family money management.

## Core Promise

> "Forma helps your family become more structured and disciplined with money — so you can save more, spend less, and see your financial future clearly."

## Target Users

### Primary Persona: Family Financial Manager
- Parents (typically 30-50 years old) managing household finances
- Dual-income households with shared financial responsibilities
- Families with children who need to track multiple spending streams
- Users who prefer manual control over automatic bank syncing (privacy-conscious)

### Secondary Persona: Financial Partner
- Spouse/partner who participates in financial decisions
- Needs visibility into family finances without managing all transactions
- May add transactions or review spending reports

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Checkpoint-Based Tracking** | Define a financial "snapshot" at a point in time, then measure progress to the next checkpoint |
| **Frictionless Transaction Entry** | Create transactions in seconds with hotkeys, inline category/type management — "easy peasy" UX |
| **Manual Statement Import** | Upload or input bank/card statements without requiring invasive bank connections |
| **Expense Categorization & Reconciliation** | Understand where family money actually went with flexible category management |
| **Recurring Transactions** | Define expected recurring income/expenses; adjust actuals when they differ from expectations |
| **Debt Payoff Strategies** | Built-in support for methods like the "Snowball" strategy to systematically eliminate debt |
| **Intelligent Forecasting** | Pattern-learning algorithms predict daily balances for the current month based on historical behavior |
| **Goal Setting** | Define and track family financial targets |

## Financial Period Model

Forma operates on a **month-based financial cycle**:

| Concept | Description |
|---------|-------------|
| **Active Month** | The current month being tracked |
| **Month Close** | End-of-month reconciliation; triggers pattern learning |
| **Month Open** | Beginning of new period; inherits forecasts from learned patterns |
| **Daily Forecast** | Predicted balance for each remaining day in the active month |

## Localization & Currency

| Attribute | Value |
|-----------|-------|
| **Primary Market** | Ukraine |
| **Primary Currency** | Ukrainian Hryvnia (UAH) |
| **Multi-Currency Support** | Yes — transactions can be entered in foreign currencies |
| **Exchange Rate Source** | National Bank of Ukraine (NBU) API |
| **Conversion Logic** | Exchange rate applied based on transaction date |

## Design Philosophy: "Executive Lounge"

The UI embodies a premium, sophisticated aesthetic:

- **Atmosphere**: Dark mode default, utilizing "Digital Ambient" lighting (warm top-right glow)
- **Physics**: The UI behaves like physical materials — Smoked Glass floating over Saddle Leather
- **Color Palette**:
  - Backgrounds: Peat Charcoal (#1C1917) & Deep Leather (#2A1D15)
  - Actions: Single Malt Gold (#E6A65D) & Burnt Copper (#B45309)
  - Data: Growth Emerald (#4E7A58) & Ice White Text (#F5F5F7)
- **Typography**: Space Grotesk (Technical/Dashboard headers) + Inter (Clean data/body)

## UX Principles

| Principle | Implication |
|-----------|-------------|
| **Speed over ceremony** | Transaction entry must be achievable in <5 seconds |
| **Inline management** | Categories, types, adjustments — no modal hell, no page navigation |
| **Hotkey-first** | Power users can operate entirely via keyboard shortcuts |
| **Graceful corrections** | When recurring transaction actuals differ from expected, adjustment is 1-2 taps — not delete & recreate |

## Target Platforms & Priority

| Platform | Priority | Viewport Target |
|----------|----------|-----------------|
| **Mobile (iOS)** | P0 — Primary | iPhone 15/16 Pro |
| **Tablet** | P1 | iPad Air (portrait + landscape) |
| **Laptop** | P1 | 14" MacBook Pro |
| **Large Display** | P2 | 4K/5K (TV screencast scenarios) |

**Design Philosophy**: Mobile-first, responsive scaling. Every breakpoint must feel intentional — not "stretched" or "shrunk."

## Quality Standard

**Forma is NOT an MVP.** It is a production-grade, daily-driver application built to the highest quality standards. Every feature must be polished, performant, and delightful to use.

## What Forma Is NOT (Current Scope v1)

| Out of Scope | Rationale |
|--------------|-----------|
| Automatic bank sync (Plaid, etc.) | Privacy-first approach; may revisit later |
| Investment/portfolio tracking | Focus on cash flow, debt, and budgeting first |
| Multi-family/business features | Individual household focus for v1 |

## Success Metrics

- **Transaction Entry Time**: <5 seconds average
- **Daily Active Usage**: Users open app at least once per day
- **Monthly Reconciliation Rate**: >90% of users complete month-end close
- **Data Accuracy**: Forecast accuracy within 10% of actual by month end
