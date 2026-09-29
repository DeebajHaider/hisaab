# Phase 6 — Complete
 
The portfolio module. The phase that gives Hisaab its "other half" — a
private, per-user place to track what you own and how it's doing — built
deliberately as the sturdy bones of an investment tracker, stress-tested
against mock portfolios rather than a real one, with the genuinely
uncertain depth features consciously deferred until there's real money to
design them against.
 
---
 
## Scope delivered
 
By the end of Phase 6, Hisaab does the following that it couldn't before:
 
- Create private portfolios (separate from budgets, never shared) and group
  what you own by asset class, with nine sensible classes seeded into every
  new portfolio and the freedom to add your own.
- Add, edit, and archive holdings under those classes, each tracked the
  simple way the sample sheet used: what you put in, and what it's worth now.
- Update a holding's value as of any date, record money added or withdrawn,
  and fix its details — three clearly separate actions so "the value moved"
  never gets confused with "I'm correcting a label" or "I moved money."
- See per-holding profit/loss in rupees and percent, green or red.
- See a portfolio overview: honest per-currency subtotals, an optional
  manual FX blend into one PKR figure, an allocation donut by asset class,
  and a read-only per-holding list.
- Expand any holding inline to see a line chart of its value over time,
  fed by a history point saved on every value change — including
  back-dated points used to fill in history.
The investment side of the app now stands on its own, alongside the
budgeting side, sharing auth, layout, theme, and the chart palette.
 
---
 
## Substeps and outcomes
 
| Substep | Topic                                                            | Outcome |
| ------- | ---------------------------------------------------------------- | ------- |
| 6.0     | Research + scoping; the value-tracked model contract             | Done    |
| 6.1     | Four tables, user-private RLS, asset-class seed trigger          | Done    |
| 6.2     | Top-level Portfolio section; portfolio + asset-class management  | Done    |
| 6.3     | Holdings CRUD grouped by asset class; portfolio sidebar layout   | Done    |
| 6.4     | Update value + add/withdraw as separate actions                  | Done    |
| 6.5     | Portfolio summary calculations (test-first)                      | Done    |
| 6.6     | Overview: totals, FX blend, allocation donut, holdings list      | Done    |
| 6.7     | Per-holding progression chart + dated value entry                | Done    |
| 6.8     | Stress test; mobile + empty-state pass; cross-user isolation     | Done    |
| 6.9     | Master-plan update; this completion report                       | Done    |
 
The model shifted meaningfully during 6.0 (twice): from a unit × price
share-tracking design to the simple value-tracked shape drawn from a real
investor's sheet, and the price-history table was pulled *forward* into the
build (the data is irreversible to collect) while the graph that reads it
stayed in scope as the per-holding progression chart.
 
---
 
## The model, and why it's shaped this way
 
Every holding is two numbers: **original investment** and **current value**.
Profit is the gap, in rupees and percent. No share counts, no per-unit
prices, no buy/sell ledger. This is exactly how the sample sheet tracked
everything — gold, property, retirement funds, forex, and stocks alike — and
it covers all of them with one shape. The richer share-by-share style (units,
individual trades, realized-vs-paper profit on a partial sale, dividends) is
**deferred**, to be added later as an optional per-holding mode if and when
active trading makes it matter. Nothing is lost by waiting; the data model
doesn't need it to be correct today.
 
---
 
## Architecture additions
 
### New database objects (one migration: `add_portfolio_tables`)
 
| Object                              | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `portfolios` table                  | Private container, just a name. RLS: `created_by = auth.uid()`.|
| `asset_classes` table               | Groups inside a portfolio; soft-delete via `is_archived`.      |
| `holdings` table                    | The things you own; carries `original_investment`, `current_value`, `current_value_at`, `currency`. |
| `holding_value_history` table       | One row per value change; feeds the progression chart.         |
| `owns_portfolio(p_id)` function     | Security-definer ownership helper, owned by `postgres`.        |
| `seed_default_asset_classes` trigger| Seeds nine classes into every new portfolio.                   |
 
All four tables are user-private. RLS on the three child tables pivots on
`owns_portfolio(portfolio_id)`; the `portfolios` table checks ownership
directly. This is the first user-scoped (not budget-scoped) data in the app.
 
### New routes
 
```
/app/portfolio                                  → PortfoliosHome
/app/portfolio/:portfolioId                     → PortfolioLayout
  (index)                                        → redirect to overview
  /overview                                      → PortfolioOverview (landing)
  /holdings                                      → PortfolioHoldings
  /manage                                        → PortfolioManage
```
 
A two-item section nav (Budgets / Portfolio) was added to `AppLayout`. The
portfolio sidebar (Overview / Holdings / Manage) mirrors the budget sidebar,
desktop rail + mobile drawer, with no "updates aren't live" note since a
portfolio is single-user.
 
### New pure helpers (all tested)
 
| File                                            | Purpose                                                       | Tests |
| ----------------------------------------------- | ------------------------------------------------------------- | ----- |
| `lib/calculations/holding-profit.ts`            | calculateHoldingProfit — current − invested, $ and %          | 6     |
| `lib/calculations/holding-investment.ts`        | applyAddInvestment / applyWithdrawal — capital changes        | 7     |
| `lib/calculations/portfolio-summary.ts`         | summarizeByCurrency, convertToBase, blendedTotals, allocationByAssetClass | 15 |
| `lib/format/group-holdings.ts`                  | groupHoldingsByAssetClass — buckets holdings, keeps order     | 4     |
| `lib/format/collapse-history.ts`                | collapseHistoryByDay — one point per day, latest wins         | 5     |
| `lib/format/money.ts`                            | formatMoney — "Rs" for PKR, code prefix otherwise (untested helper) | — |
 
**Test count delta:** about 37 new tests, all paisa-safe with at least one
float-safety case each, bringing the suite to roughly 266.
 
### New query and mutation hooks
 
| Hook / file                       | Notes                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `usePortfolios` / `usePortfolio`  | List and single (maybeSingle for the not-found state).       |
| `useAssetClasses`                 | includeArchived flag in the cache key.                       |
| `useHoldings`                     | includeArchived flag; active-only on the overview.           |
| `useHoldingHistory`               | Per-holding value history; disabled until needed.            |
| `use-portfolio-mutations.ts`      | create / rename / delete (cascade).                          |
| `use-asset-class-mutations.ts`    | create / rename / set-archived.                              |
| `use-holding-mutations.ts`        | create, update-details, update-value, adjust (add/withdraw), set-archived. |
 
Cache key factories: `portfolioKeys`, `assetClassKeys`, `holdingKeys`,
`holdingHistoryKeys` — all the established `[resource, ...ids]` shape.
 
### New components
 
- `portfolio-form-dialog`, `asset-class-form-dialog`, `asset-class-list`
- `holding-form-dialog` (dual-mode, dual-control; create-mode date field)
- `holding-list` (group section + row with ⋮ menu and inline-expand chart)
- `update-value-dialog`, `adjust-investment-dialog`
- `allocation-donut` (donut + legend, no center label), `holding-summary-list`
- `holding-history-chart` (inline line chart)
- `portfolio-layout` (sidebar + mobile drawer)
- Routes: `portfolios-home`, `portfolio-overview`, `portfolio-holdings`,
  `portfolio-manage`
### Modified existing files
 
- `App.tsx` — portfolio route tree; `Navigate` import.
- `components/layout/app-layout.tsx` — Budgets / Portfolio section nav with
  path-based active state.
- `components/manage/archive-confirm-dialog.tsx` — widened `kind` to include
  "asset class" and "holding"; added optional controlled mode (open /
  onOpenChange). Additive — existing budget usages unaffected.
No changes to the Phase 1–5 schema or budget code paths.
 
---
 
## Decisions worth remembering
 
### 1. Value-tracked, not unit-priced
Two numbers per holding. Share-level detail is a deferred optional mode, not
the default. The sample sheet — a real investor's — used the simple shape for
everything, so it's the right v1.
 
### 2. Portfolio → asset classes → holdings, but private
Mirrors budget → categories → items so the screens and patterns carry over,
with the one difference that everything pivots on `auth.uid()`, not
membership. No members, no sharing.
 
### 3. Denormalized `portfolio_id` on holdings and history
A deliberate departure from the budget side's item → category → budget walk
(which needed extra helpers and gave PostgREST trouble). Carrying the
portfolio id directly makes RLS a single `owns_portfolio(portfolio_id)`
check. The invariant (a holding's portfolio must match its asset class's
portfolio) is maintained by the app, which sets both from the chosen class.
 
### 4. Three separate holding actions
**Update value** (revaluation), **Add or withdraw** (capital change), and
**Edit details** (labels + an invested correction). Splitting these fixed an
earlier confusing single edit field where changing the value felt backwards.
Edit details never touches the current value.
 
### 5. Withdraw = proportional, no realized-gain figure (choice A)
Adding raises invested and value together; withdrawing lowers value by the
amount and invested proportionally, so the gain percentage holds. No separate
realized-gain number — that belongs to the deferred share-level mode.
 
### 6. Currency: honest by default, blend only on request
Per-currency subtotals always show, never converted. A foreign currency
surfaces an optional "1 USD = X PKR" box; only then is a single blended PKR
total shown. Any currency without a rate is flagged as excluded, never
silently fabricated. No automatic exchange rates.
 
### 7. Allocation donut has no center label
Deliberately. The month-view donut put its total in the hole, where the hover
tooltip covered it. This donut leaves the hole clean, puts totals in their own
cards, and uses a legend for exact values and shares — so the tooltip never
collides with anything important.
 
### 8. `.select()` is safe on holding create
The no-`.select()` rule existed because budget creation fired a
membership-writing trigger that the RETURNING clause's SELECT policy then
tried to read mid-statement. Holdings have no such trigger and the parent
portfolio already exists and is owned, so returning the new row to seed the
first history point is safe.
 
### 9. Value history, and the "newest point wins" rule
Every value-setting action (create, update value, add/withdraw) logs a
history row. The holding's cached `current_value` is only overwritten when the
new point is dated on or after the latest recorded one. Back-dating a point to
fill a gap adds history without rewriting what the holding is worth today.
 
### 10. Dated entry, floored and capped
Create and Update value both take an "as of" date — defaulting to today,
capped at today, and (for updates) floored at the holding's earliest recorded
date. Add/withdraw is dated today only, since a capital movement is a present
action rather than something you back-fill.
 
### 11. Inline-expand chart, mounted on demand
The progression chart is rendered only when its row is expanded, so the
ResponsiveContainer measures a real width (no zero-height collapse) and
history is fetched only for the holding you actually open.
 
### 12. Per-holding progression in scope; the harder graphs deferred
The single-holding line chart shipped. The whole-portfolio value-over-time
graph and a single annualized-return number (XIRR/CAGR) are deferred — but the
history table is collecting their data from day one, so neither needs a
migration when built.
 
---
 
## Known limitations carried forward
 
These are documented properties of what shipped, not bugs:
 
1. **No whole-portfolio value-over-time graph yet.** Only per-holding. The
   `holding_value_history` table is accruing the data needed to build it.
2. **No annualized-return number.** Total profit/percent only. XIRR is the
   intended eventual headline; the dated history already supports it.
3. **The FX blend rate is transient UI state**, not persisted — re-enter it
   per visit to the overview. Persisting it (per portfolio) is a small future
   addition if it becomes annoying.
4. **`current_value_at` stores the as-of date**, losing time-of-day. Cosmetic;
   it only marks which point is newest.
5. **The holding row is dense on the narrowest phones.** Verified acceptable
   in the 6.8 pass; flagged as the one spot to revisit if it ever wraps.
6. **The denormalized `portfolio_id` invariant is app-maintained**, not
   enforced by a DB constraint. The create flow sets both fields from the
   chosen asset class.
---
 
## Stress test (6.8) — what was verified
 
A four-holding mock portfolio with known-correct expected outputs: a PKR
commodity at a loss (−6.79%), a small-fractional PKR stock (+4.05%), a PKR
retirement fund up big (+150%), and a USD ETF (+20%). Confirmed: per-holding
profit colours and percentages; per-currency subtotals (PKR +19.25%, USD
+20.00%); the blended PKR total at a manual rate (+19.28%); allocation shares
with and without the rate (USD correctly excluded until a rate is entered); a
four-point progression line including a back-dated point that did **not**
overwrite the current value; add (absolute profit held, percent diluted) and
withdraw (percentage preserved). Empty states confirmed present on every
screen. Mobile walked at ~375px. Cross-user isolation verified with two real
logins: a second account sees none of the first's portfolios and gets a
not-found state on a direct URL — the proof the RLS holds against a pasted
link, which the SQL editor (service-role, RLS-bypassing) cannot test.
 
---
 
## File index
 
### New files
 
```
supabase/migrations/
└── <timestamp>_add_portfolio_tables.sql            (6.1)
 
src/
├── components/
│   ├── layout/
│   │   └── portfolio-layout.tsx                     (6.3)
│   └── portfolio/
│       ├── allocation-donut.tsx                     (6.6)
│       ├── adjust-investment-dialog.tsx             (6.4)
│       ├── asset-class-form-dialog.tsx              (6.2)
│       ├── asset-class-list.tsx                     (6.2)
│       ├── holding-form-dialog.tsx                  (6.3, updated 6.4 + 6.7)
│       ├── holding-history-chart.tsx                (6.7)
│       ├── holding-list.tsx                         (6.3, updated 6.4 + 6.7)
│       ├── holding-summary-list.tsx                 (6.6)
│       ├── portfolio-form-dialog.tsx                (6.2)
│       └── update-value-dialog.tsx                  (6.4, updated 6.7)
├── lib/
│   ├── calculations/
│   │   ├── holding-investment.ts                    (6.4) + test
│   │   ├── holding-profit.ts                        (6.3) + test
│   │   └── portfolio-summary.ts                     (6.5) + test
│   └── format/
│       ├── collapse-history.ts                      (6.7) + test
│       ├── group-holdings.ts                        (6.3) + test
│       └── money.ts                                 (6.4)
├── queries/
│   ├── asset-class-keys.ts                          (6.2)
│   ├── holding-history-keys.ts                      (6.7)
│   ├── holding-keys.ts                              (6.3)
│   ├── portfolio-keys.ts                            (6.2)
│   ├── use-asset-class-mutations.ts                 (6.2)
│   ├── use-asset-classes.ts                         (6.2)
│   ├── use-holding-history.ts                       (6.7)
│   ├── use-holding-mutations.ts                     (6.3, updated 6.4 + 6.7)
│   ├── use-holdings.ts                              (6.3)
│   ├── use-portfolio.ts                             (6.2)
│   ├── use-portfolio-mutations.ts                   (6.2)
│   └── use-portfolios.ts                            (6.2)
└── routes/
    ├── portfolio-holdings.tsx                       (6.3)
    ├── portfolio-manage.tsx                         (6.3)
    ├── portfolio-overview.tsx                       (6.6)
    └── portfolios-home.tsx                          (6.2)
```
 
`src/routes/portfolio-detail.tsx` was created in 6.2 and **deleted** in 6.3
when the sidebar layout split it into the holdings and manage pages.
 
### Modified files
 
- `src/App.tsx` — portfolio route tree, `Navigate` import.
- `src/components/layout/app-layout.tsx` — Budgets / Portfolio section nav.
- `src/components/manage/archive-confirm-dialog.tsx` — extra `kind`s +
  optional controlled mode.
### Project-knowledge docs
 
- `portfolio-research-notes.md` — the 6.0 scoping contract (already in
  project knowledge).
- `Phase_6_complete.md` — this file.
- `hisaab-master-plan.md` — Phase 6 status flips to done (see below).
---
 
## Commits
 
Phase 6 shipped across seven feature commits (6.0 produced docs; 6.8 produced
verification, no code; 6.9 is docs):
 
```
feat: add portfolio tables, RLS, and asset-class seed trigger
feat: add portfolio section with portfolio and asset-class management
feat: add holdings tracking grouped by asset class
feat: add update-value and add/withdraw actions for holdings
feat: add portfolio summary calculations
feat: add portfolio overview with totals, allocation, and holdings
feat: add per-holding value history chart and dated value entry
```
 
---
 
## Master-plan status change
 
In `hisaab-master-plan.md`, the Phase 6 row moves from `deferred` to `✓ done`:
 
```
| 6     | Portfolio module                          | ✓ done      |
```
 
---
 
## What's next
 
Phase 6 closes the planned roadmap. Both halves of the app — budgeting and
portfolio — are now complete and independently shippable. Remaining work is
opt-in, need-driven:
 
- **Portfolio depth (a future "6.5").** When real investing starts: the
  whole-portfolio value-over-time graph (data already accruing), an XIRR
  annualized return, the optional share-level mode (units, buys/sells,
  realized gain, dividends), and broker-statement import. All were
  deliberately deferred, not forgotten; the scoping doc remains the starting
  point.
- **Playwright E2E** — cut from Phase 5.9, still pending. The portfolio module
  is the natural moment to stand up the test harness, since it adds a second
  domain worth covering end to end.
- **Phase 7+ long tail** — receipt OCR, recurring transactions, multi-currency
  auto-FX, budget targets, bank integration, push, offline. Each is its own
  phase, none currently planned.
The portfolio module was built blind by design — the bones that don't change
across every tracker surveyed — and proven against mock portfolios rather than
theory. It will earn its depth features when there's a real portfolio to shape
them.
 
