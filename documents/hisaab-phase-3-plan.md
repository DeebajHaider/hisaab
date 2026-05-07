# Phase 3 — Month view, charts, income, savings, variance

This is the plan for Phase 3. Pair with `hisaab-master-plan.md` (overall
roadmap) and `hisaab-architecture.md` (what's already built).

---

## Goal

Replace the right-hand summary panel of the original Google Sheets template.
Once Phase 3 is done, you can answer at a glance:

- How much did the budget spend this month?
- What categories took the biggest share?
- What was the income vs spending variance?
- How is monthly spending trending over time?

By the end you should be able to delete the spreadsheet for the categories
already covered.

---

## Estimated effort

5-6 sessions of focused work, broken into 6 substeps.

---

## Build order

### 3.1 — Month view shell + monthly transactions query

Lay out the shell and data layer. No charts yet.

- New route: `/app/budgets/:budgetId/month/:yearMonth` (e.g., `/2026-05`)
- New sidebar item "Month" alongside Day and Manage in `BudgetLayout`
- Month picker header with prev/next month nav (parallel to `DayHeader`)
- `useMonthTransactions(budgetId, yearMonth)` query — all transactions for
  the month, with item + category + person joined
- Cache key: `transactionKeys.byMonth(budgetId, yearMonth)` (already in the
  factory — never used yet)
- Empty state and loading skeleton

**TDD here:** date helpers — `addMonths(yearMonth, n)`, `formatMonthLabel(yearMonth)`
(returns "May 2026" or similar), `firstDayOfMonth(yearMonth)`, `lastDayOfMonth(yearMonth)`.
These are pure and have leap-year + boundary edge cases.

### 3.2 — Monthly summary card

A single card at the top of the month view with the headline numbers.
No charts yet — just the data.

- Total expenses for the month (sum of transactions)
- Average spend per day (total ÷ days-in-month-so-far if current month, else full month)
- Largest category (name + amount)
- Number of transactions logged
- Per-person totals if any tracked-categories were used

`useMonthSummary` derived hook (or just inline computation in the view).

**TDD here:** `calculateMonthSummary(transactions, monthMeta)` — takes the
raw transactions list and computes the summary object. Pure function.

### 3.3 — Income and savings entries

Add these in before charts because variance needs them.

- `useIncome(budgetId, yearMonth)` query
- `useSavings(budgetId, yearMonth)` query
- Mutation hooks for create/update/delete on both
- A small "Income" section on the month view with add/edit/delete buttons
  (mini-table or list)
- Same for "Savings allocations"
- Variance = Income − Expenses − Savings, shown prominently

The UI is tighter than transactions — just amount + source/name + date + notes
in a single-row form, no category complexity.

**TDD here:** `calculateVariance(income, expenses, savings)` — pure, trivial,
but tested for clarity.

### 3.4 — Charts setup + bar chart on month view

Install Recharts, wrap shadcn's chart wrapper if helpful, build the first chart.

```bash
npm install recharts
```

- Bar chart on the month view: spending per category, sorted descending,
  with % labels
- Use the existing `calculatePercentContribution` for percentages
- Color from the teal scale; vary lightness across bars

**TDD here:** None directly on the chart — but the `getCategoryBreakdown(transactions)`
helper that produces `{ categoryName, total, percent }[]` is pure and worth testing.

### 3.5 — Trends page

A new sibling route to Day, Manage, Month: `/app/budgets/:budgetId/trends`.

- Line chart: monthly grand total over the last 6 (default) or 12 months
- Stacked bar chart: monthly totals broken down by category
- Date range picker (default last 12 months)
- Optional category filter

This needs a new query that pulls aggregated data. Probably:

- `useMonthlyTotals(budgetId, fromYearMonth, toYearMonth)` — returns
  `{ yearMonth, total, byCategory: {[catName]: amount} }[]`
- For efficiency, we may add a Postgres view or RPC function that
  pre-aggregates. For starting volumes, fetching the rows and aggregating
  client-side is fine.

**TDD here:** `aggregateByMonth(transactions)` and `aggregateByCategoryAndMonth(transactions)`
as pure helpers.

### 3.6 — Month view donut + polish

- Donut chart on the month view alongside the bar chart (same data, different read)
- Polish loading states, empty states, narrow-screen layouts
- Ensure both charts respond gracefully on mobile (Recharts `ResponsiveContainer`)
- Verify all the existing flows still work

---

## Decisions to lock in early

Before starting, decide:

1. **How is "month" represented in URLs?** `2026-05` (recommended — sortable,
   compact, matches our cache key) vs `may-2026` (prettier but harder to parse).

2. **Default date range for the Trends page?** 6 months or 12 months?

3. **Where to put income and savings entry — month view or a separate "Money"
   page?** I'd put them on the month view to start (everything monthly in one
   place); a separate page can come later if it gets crowded.

4. **Variance display.** Card on month view, or always-visible chip in the
   month header? I'd suggest a prominent card alongside the summary card so
   you see it at a glance.

---

## What's *not* in Phase 3

- Cross-budget rollups (e.g., "all my budgets combined")
- Budget targets / alerts
- Recurring transactions / income
- Year-over-year comparisons
- Export to CSV

These are all reasonable Phase 5+ additions.

---

## Patterns to reuse

This phase should largely follow established patterns rather than introduce
new ones. Specifically:

- Pure-function-first calculations, tested. Patterns from `day-totals.ts`,
  `percent-contribution.ts` apply directly.
- Cache key factories. Extend `transactionKeys` if needed; create
  `incomeKeys` and `savingsKeys` in their own files for the new resources.
- Query hook + mutation hook split. `useX` for reads, `useXMutations` (or
  individual `use-create-X.ts` files matching the older pattern) for writes.
- Dual-mode forms for income/savings entries.
- Skeletons for loading states, never spinners except for in-flight mutations.

---

## Test count target

Phase 3 should add roughly 25-35 new tests covering:

- Date helpers for month math (5-7 tests)
- Month summary calculation (3-5 tests)
- Variance calculation (3-4 tests)
- Category breakdown (3-4 tests)
- Monthly aggregation (4-6 tests)
- Per-month per-category aggregation (4-6 tests)

Target end-of-Phase-3 total: ~115-120 tests.

---

## Suggested first-message prompt for the new chat

Once you've added the master plan, architecture summary, and this Phase 3 plan
to project knowledge, your first message in the new chat can be short:

> Continuing Hisaab work — see project knowledge for the master plan,
> architecture, and Phase 3 plan. Phases 1 and 2 are complete. Let's start
> 3.1: month view shell and the monthly transactions query. Same teaching
> style as before — explain decisions as we go, TDD on pure logic, walk
> through code in chunks.

That gives the next instance everything it needs.
