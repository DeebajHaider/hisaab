# Phase 6 — Portfolio module (investment tracking)
 
This is the plan for Phase 6. Pair with `hisaab-master-plan.md` (roadmap),
`hisaab-architecture.md` (codebase conventions), and the latest phase
completion doc.
 
---
 
## What's different about this phase
 
Up to now, every phase has started with a clear scope — the Google Sheet
defined what to build, and the work was translation + extension. Phase 6
inverts that. **The user doesn't currently invest meaningfully**, which
means the scope itself is unknown. Building features blindly here would
produce something that looks right but feels off the first time a real
investor uses it.
 
So Phase 6 starts with **research**, not code. Substep 6.0 is a research
pass to map the actual problem space; everything after 6.0 is informed by
what that pass surfaces.
 
This is also the largest scope expansion in the project so far. Portfolio
tracking is a domain unto itself — there are SaaS products dedicated only
to this (Sharesight, Portfolio Performance, Snowball Analytics). We're not
competing with them; we're building the "good enough to replace the
spreadsheet" version, scoped tight.
 
---
 
## Goal
 
By end of Phase 6, the user can:
 
1. Add a holding (a specific stock, ETF, mutual fund, etc.) with its
   asset class and currency.
2. Log buy/sell transactions and dividends against that holding.
3. Manually update the current price (we're not fetching live quotes —
   see decisions).
4. See per-holding performance: gain/loss in absolute and percent terms,
   cost basis, current value, dividends received.
5. See portfolio-level summaries: total invested, total current value,
   total returns, allocation by asset class.
6. See trends: total portfolio value over time, individual holding value
   over time, category-level trends.
What's *not* in Phase 6 (deferred to later if needed):
 
- Automatic price fetching from a market API
- Multi-currency conversion with live FX rates
- Tax lot tracking (FIFO/LIFO/specific identification)
- Options, futures, crypto, real estate
- Dividend reinvestment automation
- Benchmarking against indices
- Account-level grouping (e.g., "this holding is in my Roth IRA")
If any of these turn out to be essential after research, fold them in
explicitly; otherwise hold the line.
 
---
 
## Substep 6.0 — Research and scoping (research pass, no code)
 
This is the most important substep in the phase. Skipping it means
guessing.
 
### Research targets
 
Spend a focused session reading enough to feel like you understand how an
actual long-term retail investor in Pakistan (or globally) tracks their
holdings. Concretely:
 
**The basic model — read until comfortable:**
- What's the difference between *cost basis*, *current value*, *realized
  gain*, and *unrealized gain*? How do these compose?
- How are *dividends* tracked separately from *buys/sells*? Why?
- What's *total return* vs. *price return*?
- What's *CAGR* (compound annual growth rate) and how is it different from
  a simple total return percentage?
- What's *XIRR* and why do investors prefer it over CAGR when there are
  multiple cash flows?
**Concrete spreadsheet examples — search for and skim:**
- "Personal investment tracker spreadsheet template" — examples from
  blogs like Bogleheads, MoneyMustache, Indian PF, ET Money
- Bogleheads wiki on "Tracking your portfolio"
- Look at Sharesight's free-tier feature list to see what they consider
  table stakes (don't sign up, just read marketing pages)
- Portfolio Performance's docs — open source, well-documented, gives a
  reasonable feature ceiling
**Pakistan-specific context:**
- How do retail investors track PSX stocks? Brokers typically email
  CSV statements — what columns?
- What's National Savings? Defence Saving Certificates, Pakistan
  Investment Bonds — do they fit the same model or need different
  treatment?
- Foreign investments (US stocks via brokers like SCB Sahulat or
  international brokers) — different currency, same model?
- Real estate is the elephant. Many Pakistani families have land and
  property as a major asset. Out of scope or in?
**Time investment for 6.0:** 2-3 hours of reading, with notes. Produce a
short markdown doc at the end (`portfolio-research-notes.md`) capturing:
- The minimal entity model (Holding, Transaction kinds, etc.)
- The calculations to support (cost basis, gain/loss, current value, …)
- What's in scope for Phase 6 and what's deferred
- Open questions to confirm with the user before coding
### Deliverable from 6.0
 
A scoping document the user approves before any code is written. Format
similar to this plan but specific to the entity model and calculations.
 
---
 
## Tentative substep structure (will firm up after 6.0)
 
The shape below is what most portfolio trackers converge to. Treat it as a
hypothesis to validate, not a contract.
 
### 6.1 — Schema and types
 
Tables (proposed):
 
```sql
-- A specific investment the user holds
create table public.holdings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id),
  name               text not null,           -- "Vanguard Total Stock Market ETF"
  ticker             text,                    -- "VTI" (optional, freeform)
  asset_class        text not null,           -- 'individual_stock' | 'etf' | 'mutual_fund' | 'money_market' | 'bond' | 'other'
  currency           text not null default 'PKR',
  current_price      numeric not null default 0,  -- last manually-set price per unit
  current_price_at   timestamptz,
  notes              text,
  is_archived        boolean not null default false,
  created_by         uuid not null default auth.uid(),
  created_at         timestamptz not null default now()
);
 
-- Buy/sell/dividend/fee events against a holding
create table public.holding_transactions (
  id                 uuid primary key default gen_random_uuid(),
  holding_id         uuid not null references public.holdings(id) on delete cascade,
  kind               text not null,           -- 'buy' | 'sell' | 'dividend' | 'fee' | 'split'
  date               date not null,
  units              numeric,                 -- units transacted (required for buy/sell)
  price_per_unit     numeric,                 -- price at the time (required for buy/sell)
  amount             numeric not null,        -- total cash movement (positive in, negative out)
  notes              text,
  created_by         uuid not null default auth.uid(),
  created_at         timestamptz not null default now()
);
```
 
Portfolio is **per-user, not shared**. That's a simplification — most
people don't want to share investment data with family even if they share
expense data. Schema design reflects this.
 
RLS: standard pattern — user can only see their own holdings and
transactions, identified via `user_id` on holdings and indirectly through
`holdings.user_id` on transactions.
 
Run `npm run types:supabase` after.
 
### 6.2 — Holdings list + create/edit/archive
 
Mirror image of the Manage page for categories:
 
- Route: `/app/portfolio` (top-level, outside the budgets sidebar)
- List view: holdings grouped by asset class, with name + current value +
  gain/loss column
- Dialogs: HoldingFormDialog (dual-mode create/edit), ArchiveConfirmDialog
- Archive ≠ delete. Archive hides; preserves transaction history.
### 6.3 — Holding transactions (buy/sell/dividend)
 
Per-holding detail page with a transaction list and entry form.
 
- Route: `/app/portfolio/:holdingId`
- Entry form: date, kind (radio: buy/sell/dividend/fee), units, price,
  amount (auto-computed for buy/sell when units × price)
- Transaction list with edit/delete (matches the day-view pattern)
### 6.4 — Calculations (TDD heavy)
 
Pure functions, all tested:
 
- `calculateCostBasis(transactions)` — total invested net of sells
- `calculateUnits(transactions)` — units currently held
- `calculateUnrealizedGain(holding, units, costBasis)` — current value − cost basis
- `calculateRealizedGain(transactions)` — sum of (sell_price − avg_cost) × units for past sells
- `calculateTotalReturn(transactions, currentValue)` — includes dividends
- `calculateCAGR(transactions, currentValue)` — annualized return
- Maybe `calculateXIRR(transactions, currentValue)` — XIRR is the gold
  standard but the algorithm is non-trivial (Newton's method root finding).
  Decision in 6.0 whether to include.
Each gets dedicated tests covering edge cases: holding with only a buy,
holding with multiple buys averaging cost basis, partial sell, complete
sell + rebuy, dividend before any sell, etc.
 
### 6.5 — Portfolio overview + charts
 
- Route: `/app/portfolio` (overview)
- Total invested, total current value, total return (absolute + %)
- Allocation pie/donut by asset class
- Top movers (best/worst performing holdings)
- Holdings table with sortable columns
### 6.6 — Trends and per-holding charts
 
- Portfolio value over time (line chart, requires snapshotting or
  recomputation — see below)
- Per-holding value over time
- Asset class composition over time (stacked bar)
**The price history problem:** computing "portfolio value on 2026-01-15"
means knowing the price of every holding on that date. We don't have that
— we only have the *current* price. Three options to research in 6.0:
 
1. **Snapshot on every price update.** When the user updates a current
   price, store a row in a `holding_price_history` table. Builds history
   organically over time but starts empty.
2. **Reconstruct from transactions.** Use transaction prices as data
   points; interpolate between them. Cheap, no extra storage, but
   inaccurate between transactions (a holding can change in value without
   any transaction happening).
3. **Manual price entry over time.** Let the user explicitly add price
   observations at any date.
Pick one in 6.0 after research. Snapshot-on-update is probably the right
default; it's lossy at the start but gets richer over time.
 
### 6.7 — Polish and verification
 
- Empty states for the very-first-time portfolio user
- Mobile layout pass
- Verify cross-budget isolation: family members shouldn't see your
  portfolio data
- Update `hisaab-master-plan.md` to mark Phase 6 complete
- Write `Phase_6_complete.md`
---
 
## Architectural decisions to lock in after 6.0
 
These should come out of the research and be confirmed before 6.1 starts:
 
1. **Currency model.** Single currency per holding, with manual
   conversion if the user wants a unified view? Or auto-FX? **Initial
   recommendation:** single currency per holding, no auto-FX. Each
   holding shows in its native currency; the overview shows a total in
   PKR using a single user-set FX rate.
2. **Price history strategy.** Snapshot on update, reconstruct, or
   manual entry. See 6.6.
3. **Cost basis method.** Average cost is by far the simplest and
   matches what most retail trackers use. FIFO/LIFO/specific-ID is
   tax-driven and out of scope unless 6.0 surfaces a strong need.
4. **Dividends as transactions vs separate entity.** Transactions is
   simpler; the `kind` field already accommodates it. Recommendation:
   transactions table with `kind = 'dividend'`.
5. **XIRR vs CAGR.** Decide in 6.0.
6. **Top-level route placement.** `/app/portfolio` as a sibling of
   `/app/budgets`, with its own layout. Portfolio is per-user, not
   per-budget — different mental model.
7. **Sidebar nav.** Add a "Portfolio" entry alongside "Budgets" at the
   `AppLayout` level. The budget-scoped sidebar (Day/Month/Trends/Manage)
   doesn't apply here.
---
 
## Patterns to reuse from earlier phases
 
- Dual-mode form pattern (`existing` prop)
- Dual-control dialog pattern (`trigger` vs `open + onOpenChange`)
- Cache key factories per resource (`holdingKeys`, `holdingTransactionKeys`)
- Pure-function calculations with strict TDD
- Cents-based / minor-unit-based money math (paisa for PKR, cents for USD)
- Recharts for visualizations
- Mutations don't `.select()` the inserted row; invalidate and refetch
- Skeleton loading states
- Conventional Commits per substep
---
 
## Patterns introduced new in Phase 6
 
- **User-scoped (not budget-scoped) data.** First time we have a resource
  that doesn't sit under a budget. RLS pattern is `auth.uid() = user_id`
  directly rather than `is_budget_member()`.
- **Time-series visualization beyond month boundaries.** Trends in Phase
  3 are monthly aggregates; portfolio trends may need daily or weekly
  granularity depending on the price history decision.
- **Cross-domain currency display.** Mixed-currency holdings need careful
  UX so the user knows what they're looking at.
---
 
## Test count target
 
Phase 6 should be heavy on pure-function tests because the calculations
are non-trivial and easy to get wrong silently.
 
- Cost basis (5-7 tests)
- Units calculation (3-5)
- Unrealized/realized gains (5-7)
- Total return with dividends (3-5)
- CAGR (3-5)
- XIRR if included (5-8)
- Allocation / aggregation helpers (5-7)
Target: 30-50 new pure-logic tests. End of Phase 6: ~225-245.
 
---
 
## Estimated effort
 
7-9 sessions:
- 6.0: 1 session (mostly reading + writing scope doc)
- 6.1-6.2: 1 session each
- 6.3-6.4: 1-2 sessions each (6.4 is the heavy TDD substep)
- 6.5-6.6: 1-2 sessions each
- 6.7: 1 session
Roughly the same effort as Phase 3, with more upfront thinking and less
upfront certainty.
 
---
 
## Risks worth naming up front
 
1. **Scope creep.** Portfolio tracking has infinite depth. The 6.0 doc
   needs to draw a clear line and stick to it.
2. **The "I don't actually use this" problem.** If the user isn't
   actively investing, the feature will be built theoretically. Consider
   either (a) building a minimum viable version and stress-testing with
   2-3 mock portfolios, or (b) deferring until there's a real personal
   need.
3. **Price-history strategy lock-in.** Whichever option is chosen in 6.0
   is hard to migrate away from later. Worth a careful think.
4. **XIRR implementation.** If included, getting the Newton's method
   convergence right is fiddly. There are npm packages that do this;
   consider one rather than reimplementing.
5. **The portfolio module is "the other half of the app."** It's a
   meaningful conceptual extension. Make sure routing, layout, and nav
   reflect that it's not just another budget feature.
---
