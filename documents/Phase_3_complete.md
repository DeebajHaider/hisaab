# Phase 3 — Complete
 
Month view, charts, income, savings, variance, and trends. The phase that
replaces the right-hand summary panel of the original Google Sheets template
and adds the trends dashboard for long-range pattern reading.
 
---
 
## Scope delivered
 
By the end of Phase 3, Hisaab answers the following at a glance:
 
- How much did the budget spend this month?
- What categories took the biggest share, both as composition and ranking?
- What was the income vs expenses vs savings variance?
- How is monthly spending trending over weeks, months, or years?
- How do specific categories trend relative to each other?
- What was each month's spending made of?
The right-hand panel of the original spreadsheet is now deletable for every
category covered.
 
---
 
## Substeps and timeline
 
| Substep | Topic                                                      | Outcome |
| ------- | ---------------------------------------------------------- | ------- |
| 3.1     | Month view shell, monthly transactions query, navigation   | Done    |
| 3.2     | Monthly summary card (totals, average per day, per-person) | Done    |
| 3.3     | Income and savings CRUD with variance card                 | Done    |
| 3.4     | Recharts setup + category breakdown bar chart on month view | Done    |
| 3.5     | Trends page foundation: timeframe selector + line chart    | Done    |
| 3.6     | Category comparison (multi-line) + composition (stacked bar) | Done   |
| 3.7     | Donut chart on month view + cross-cutting polish           | Done    |
 
Originally planned as 6 substeps; expanded to 7 after recognizing the trends
page needed both a foundation pass (3.5) and a depth pass (3.6) to avoid a
single overloaded session.
 
---
 
## Architecture additions
 
### New routes
 
```
/app/budgets/:budgetId/month                      → MonthRedirect (current month)
/app/budgets/:budgetId/month/:yearMonth           → MonthView
/app/budgets/:budgetId/trends                     → Trends
```
 
Sidebar nav order: Day view → Month → Trends → Manage.
 
### New pure helpers (all tested)
 
| File                                                | Purpose                                         | Tests |
| --------------------------------------------------- | ----------------------------------------------- | ----- |
| `lib/format/year-month.ts`                          | YearMonth type + addMonths, formatMonthLabel, firstDayOfMonth, lastDayOfMonth, currentYearMonth | 26 |
| `lib/calculations/month-summary.ts`                 | calculateMonthSummary — totals, average per day, largest category, per-person | 18 |
| `lib/calculations/variance.ts`                      | calculateVariance — income − expenses − savings | 6     |
| `lib/calculations/category-breakdown.ts`            | getCategoryBreakdown — grouped totals + percent share | 7 |
| `lib/calculations/aggregate-by-month.ts`            | aggregateByMonth — monthly totals from raw transactions | 7 |
| `lib/calculations/fill-month-gaps.ts`               | fillMonthGaps — zero-fill missing months for chart x-axis | 6 |
| `lib/calculations/resolve-timeframe.ts`             | resolveTimeframe — 1M/3M/6M/1Y/3Y/5Y/All → bounds | 10 |
| `lib/calculations/aggregate-by-category-month.ts`   | aggregateByCategoryAndMonth — Recharts-shaped rows | 7 |
| `lib/calculations/default-selected-categories.ts`   | 5% threshold capped at 8, top-5 fallback        | 6     |
| `lib/calculations/assign-category-colors.ts`        | Deterministic hash → 10-color palette mapping   | 6     |
 
**Test count delta:** +99 new tests in Phase 3, bringing total to ~185.
 
### New query hooks
 
| Hook                              | Resource                  | Notes                              |
| --------------------------------- | ------------------------- | ---------------------------------- |
| `useMonthTransactions`            | transactions              | Range query for one month          |
| `useIncome`                       | income_entries            | Range query for one month          |
| `useSavings`                      | savings_entries           | Range query for one month          |
| `useMonthlyTotals`                | aggregated transactions   | Range query, runs aggregateByMonth |
| `useMonthlyCategoryTotals`        | aggregated transactions   | Same range, with category join     |
| `useEarliestTransactionMonth`     | transactions              | One row, 1hr staleTime             |
 
### New mutation hooks
 
| File                              | Mutations                                          |
| --------------------------------- | -------------------------------------------------- |
| `use-income-mutations.ts`         | useCreateIncome, useUpdateIncome, useDeleteIncome  |
| `use-savings-mutations.ts`        | useCreateSavings, useUpdateSavings, useDeleteSavings |
 
`use-transaction-mutations.ts` was updated to also invalidate `trendsKeys.byBudget`
on every create/update/delete so charts refresh when transactions change.
 
### New cache key factories
 
| Factory          | Hierarchy                                                       |
| ---------------- | --------------------------------------------------------------- |
| `incomeKeys`     | `['income', budgetId, 'month', yearMonth]`                      |
| `savingsKeys`    | `['savings', budgetId, 'month', yearMonth]`                     |
| `trendsKeys`     | `['trends', budgetId, ('monthly' \| 'monthly-by-category' \| 'earliest'), ...]` |
 
All follow the same `[resource, budgetId, scope, ...keys]` convention as
`transactionKeys` so prefix-based invalidation cascades correctly.
 
### New components
 
#### Month view
 
- `MonthHeader` — prev/next nav, "Current month" shortcut
- `VarianceCard` — surplus/deficit/balanced with math breakdown
- `MonthSummaryCard` — total, avg/day, largest category, per-person
- `CategoryBreakdownCard` — wraps the donut + bar pair
- `CategoryBreakdownDonut` — center-labeled donut chart
- `CategoryBreakdownChart` — horizontal bar chart with percent labels
- `IncomeSection` — list + add/edit/delete for income entries
- `SavingsSection` — list + add/edit/delete for savings entries
- `IncomeFormDialog` — dual-mode (create/edit), controlled + uncontrolled
- `SavingsFormDialog` — same pattern as IncomeFormDialog
- `DeleteConfirmDialog` — generic destructive-confirm AlertDialog
#### Trends page
 
- `TimeframeSelector` — segmented control: 1M / 3M / 6M / 1Y / 3Y / 5Y / All
- `MonthlyTotalsChart` — single-line chart of total spending per month
- `CategoryComparisonChart` — multi-line chart, one line per selected category
- `CategoryCompositionChart` — stacked bar chart, all categories per month
- `CategoryMultiSelect` — horizontal scrollable chip strip with color dots
### CSS changes
 
Extended `--chart-1` through `--chart-5` (originally placeholder grayscale)
to `--chart-1` through `--chart-10` with proper OKLCH colors for both light
and dark modes. Used across all charts in the app for consistent color identity.
 
---
 
## Database
 
No schema changes in Phase 3. The `income_entries` and `savings_entries` tables
were already provisioned in Phase 1's schema; Phase 3 used them for the first time.
 
---
 
## Conventions reinforced
 
### Float-safety
 
Every calculation that sums amounts uses integer minor-unit (paisa) arithmetic
internally and converts back to rupees at the boundary. Pattern:
 
```typescript
const totalPaisa = transactions.reduce(
  (sum, t) => sum + Math.round(t.amount * 100),
  0,
);
return totalPaisa / 100;
```
 
This dodges the IEEE 754 `0.1 + 0.2 !== 0.3` trap that's visible to users
when summing many small amounts.
 
### Float-safety tests
 
Every aggregation helper includes at least one test pinning the float-safety
behavior. The canonical case: `[0.1, 0.2]` must sum to exactly `0.3`, not
`0.30000000000000004`.
 
### Mutation pattern
 
- No `.select()` on inserts — RLS evaluation order causes spurious failures.
- `created_by` left to DB default (`auth.uid()`); never set client-side.
- Explicit camelCase → snake_case translation in patches.
- Invalidate at the budget-scoped root, not the day/month level.
- Always also invalidate `trendsKeys.byBudget` so charts refresh.
### Form pattern
 
Dual-mode dialogs accept an optional `existing` prop:
- `existing` undefined → create mode
- `existing` provided → edit mode
Plus dual control modes:
- `trigger` prop → dialog manages its own open state
- `open` + `onOpenChange` props → parent controls open state
This pattern from `ItemFormDialog` (Phase 2) was extended to all new dialogs
in Phase 3.
 
### Empty-state strategy
 
- Month with no transactions, income, or savings → single empty-state card
- Month with at least one resource → variance card + summary + breakdown
  (if expenses exist) + income/savings sections always visible
- Trends page with zero history → single empty-state card
- Trends page with history but empty selection → "Pick a category" placeholder
### Color identity
 
Each category has a stable color across the entire app, derived by hashing
its name into one of 10 chart palette slots. This means:
 
- The "Groceries" slice in the donut chart
- The "Groceries" bar in the month-view breakdown
- The "Groceries" chip in the trends comparison selector
- The "Groceries" line in the trends comparison chart
- The "Groceries" stack segment in the trends composition chart
…all use the same color. Mental model: one category, one color, everywhere.
 
---
 
## Decisions worth remembering
 
### 1. URL format for months
Chose `YYYY-MM` (e.g. `2026-05`) over `may-2026`. Sortable as string, matches
cache key format, trivial to parse. Lexical comparison enables past/current/future
month detection without date arithmetic.
 
### 2. "Average per day" definition
For the current month, divides by days-elapsed-so-far (gives a "pacing"
read). For past months, divides by full days in month. For future months,
returns 0 (no division by zero).
 
### 3. Per-person totals scope
Sums across all `tracks_person` categories for each person. Transactions
with no person assignment in a tracked category bucket under "Unassigned"
so data-hygiene issues stay visible rather than getting silently dropped.
 
### 4. Variance card position
Lives at the top of the month view (above the summary card) because it
answers the most important "how did this month go?" question. Summary is
the supporting detail beneath it.
 
### 5. Variance card definition
`variance = income − expenses − savings`. Savings count against variance
because the user-defined convention treats them as an outflow goal.
 
### 6. Date constraints on income/savings dialogs
Min/max bound to the viewed month. Picking outside the month is prevented
in the date input and validated in the submit handler.
 
### 7. Trends timeframe selector
Single selector at the top of the page controls all three charts.
Considered per-chart selectors; rejected because all three charts answer
questions about the same time range.
 
### 8. "All" timeframe support
Requires the earliest transaction month. Implemented via dedicated query
hook with 1-hour staleTime — the answer changes only on rare oldest-row
deletion. Clamps shorter timeframes to earliest month so 5Y on 8 months
of data shows just the 8 months, not 60 zero-bars.
 
### 9. Comparison chart default selection
≥5% of total range spend, capped at top 8. Fallback to top 5 by total
when zero categories hit the threshold (extreme dominance case).
 
### 10. Manual override pattern
User chip selection persists across timeframe changes via `manualSelected:
string[] | null` state. `null` means "follow default". On first toggle,
becomes an array — user has taken over. Categories that disappear from
new timeframe data get filtered out automatically.
 
### 11. Composition chart scope
Shows all categories regardless of comparison-chart selection. The two
charts answer different questions and should remain independent.
 
### 12. Donut + bar pairing
Both visualisations of the same month-view data live in a single card,
side-by-side on desktop (lg:1024px+), stacked on mobile. Shared color
mapping so the same category has the same color in both.
 
### 13. Currency
Pakistani Rupees (Rs). Symbol prefixed in tooltips and the donut center
label. Underlying paisa-based arithmetic preserves precision.
 
### 14. Touch-device affordances
Hover-revealed edit/delete icons on income/savings rows are forced visible
on devices that don't support hover, via the `[@media(hover:none)]` Tailwind
arbitrary variant.
 
---
 
## Known quirks documented
 
1. **Cents → paisa terminology.** Internal variables named `cents` in 3.1–3.6
   were not renamed in 3.7. Same concept (smallest integer unit), different
   currency. Cosmetic only.
2. **Mobile bar chart label clipping.** On very narrow viewports, percent
   labels on short bars can clip against the right edge. Right margin
   increased to 64px in 3.7 to mitigate; still imperfect on the smallest
   viewports. Acceptable for now.
3. **Recharts `connectNulls` in comparison chart.** Categories with no spend
   in a given month aren't represented as zeros in the row data; the line
   connects through the gap. Cleaner-looking for sparse categories but hides
   true zeros from the comparison chart. The total spending chart still
   zero-fills properly via `fillMonthGaps`.
4. **ResponsiveContainer height.** Recharts charts must have a defined
   height on their immediate parent — wrapping `ResponsiveContainer` in
   a div with utility height classes (e.g. `h-80`) collapses the chart
   silently. All chart components specify `height={N}` directly on the
   container, no wrapping divs.
5. **Two trends queries that could be merged.** `useMonthlyTotals` (3.5)
   and `useMonthlyCategoryTotals` (3.6) overlap — the second's data could
   derive the first's by summing category columns. Kept separate because
   the first has a narrower SELECT (no category join) and is cached
   independently. Possible dedup in a future polish pass.
---
 
## What's NOT in Phase 3
 
These were considered and deferred:
 
- Cross-budget rollups
- Budget targets / alerts on overspending
- Recurring transactions / income
- Year-over-year comparisons
- CSV export
- Per-month per-category alerts ("Groceries up 30% vs 6-month avg")
- A "reset to default selection" button on the comparison chart
- Saved comparison-chart presets ("my dashboard")
- Real-time updates across multiple users
These are all reasonable Phase 5+ additions.
 
---
 
## File index
 
### New files added in Phase 3
 
```
src/
├── components/
│   ├── charts/
│   │   ├── category-breakdown-card.tsx          (3.7)
│   │   ├── category-breakdown-chart.tsx         (3.4, refactored 3.7)
│   │   ├── category-breakdown-donut.tsx         (3.7)
│   │   ├── category-comparison-chart.tsx        (3.6)
│   │   ├── category-composition-chart.tsx       (3.6)
│   │   └── monthly-totals-chart.tsx             (3.5)
│   ├── trends/
│   │   ├── category-multi-select.tsx            (3.6)
│   │   └── timeframe-selector.tsx               (3.5)
│   └── transactions/
│       ├── delete-confirm-dialog.tsx            (3.3)
│       ├── income-form-dialog.tsx               (3.3)
│       ├── income-section.tsx                   (3.3)
│       ├── month-header.tsx                     (3.1)
│       ├── month-summary-card.tsx               (3.2)
│       ├── savings-form-dialog.tsx              (3.3)
│       ├── savings-section.tsx                  (3.3)
│       └── variance-card.tsx                    (3.3)
├── lib/
│   ├── calculations/
│   │   ├── aggregate-by-category-month.ts       (3.6) + test
│   │   ├── aggregate-by-month.ts                (3.5) + test
│   │   ├── assign-category-colors.ts            (3.6) + test
│   │   ├── category-breakdown.ts                (3.4) + test
│   │   ├── default-selected-categories.ts       (3.6) + test
│   │   ├── fill-month-gaps.ts                   (3.5) + test
│   │   ├── month-summary.ts                     (3.2) + test
│   │   ├── resolve-timeframe.ts                 (3.5) + test
│   │   └── variance.ts                          (3.3) + test
│   └── format/
│       └── year-month.ts                        (3.1) + test
├── queries/
│   ├── income-keys.ts                           (3.3)
│   ├── savings-keys.ts                          (3.3)
│   ├── trends-keys.ts                           (3.5, extended 3.6)
│   ├── use-earliest-transaction-month.ts        (3.5)
│   ├── use-income.ts                            (3.3)
│   ├── use-income-mutations.ts                  (3.3)
│   ├── use-month-transactions.ts                (3.1)
│   ├── use-monthly-category-totals.ts           (3.6)
│   ├── use-monthly-totals.ts                    (3.5)
│   ├── use-savings.ts                           (3.3)
│   └── use-savings-mutations.ts                 (3.3)
└── routes/
    ├── month-redirect.tsx                       (3.1)
    ├── month-view.tsx                           (3.1, updated through 3.7)
    └── trends.tsx                               (3.5, updated 3.6)
```
 
### Modified files
 
- `src/App.tsx` — added `/month`, `/month/:yearMonth`, `/trends` routes
- `src/components/layout/budget-layout.tsx` — added Month + Trends sidebar entries
- `src/index.css` — extended chart color palette to 10 with light/dark variants
- `src/queries/use-transaction-mutations.ts` — added trendsKeys invalidation
- `package.json` — added `recharts` and `react-is@^19` dependencies
---
 
## Commits
 
Phase 3 was delivered across seven conventional commits:
 
```
feat: add month view shell with navigation and monthly transactions query
feat: add month summary card with totals and per-person breakdown
feat: add income, savings, and variance to the month view
feat: add category breakdown bar chart to month view
feat: add trends page with monthly totals line chart
feat: add category comparison and composition charts to trends page
feat: add donut chart to month view and polish phase 3
```
 
Each commit was independently testable and shippable.
 
---
 
## Phase 4 readiness
 
The architecture additions in Phase 3 leave Phase 4 (sharing) in a clean
starting state:
 
- Per-person totals UI exists in the summary card, but requires a person
  picker on the transaction entry form (deferred from Phase 2)
- RLS policies for income_entries and savings_entries are presumed in
  place from Phase 1's schema migrations; Phase 4 will exercise these
  with real multi-member access
- Variance and breakdown computations don't depend on who created the
  rows — they aggregate budget-wide, so multi-user contribution is
  already handled at the data layer
The remaining work for Phase 4 per the master plan:
- 4.1 — Email-invite flow via Supabase Auth
- 4.2 — Members management page
- 4.3 — People entity for tracked-category attribution
- 4.4 — Person picker on the transaction entry form (revisits deferred work)
- 4.5 — Real-time updates via Supabase channels
- 4.6 — RLS re-verification with multiple real users
