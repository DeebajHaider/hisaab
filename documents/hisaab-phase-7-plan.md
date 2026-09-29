# Phase 7 — Polish, fixes, and release-readiness
 
This is the plan for Phase 7. Pair with `hisaab-master-plan.md` (roadmap),
`hisaab-architecture.md` (codebase conventions), and the previous phase
completion docs (Phase 5, Phase 6).
 
---
 
## What's different about this phase
 
Every prior phase delivered one coherent capability — categories, the month
view, sharing, the portfolio module. Phase 7 is **a curated backlog of
small things** rather than a single feature. The goal is to take Hisaab
from "works for one developer who built it" to "could be shown to a
non-developer and not embarrass." After this phase, the app ships, the
developer starts using it daily, and further work is driven by real
feedback — not by speculation.
 
That framing matters because it changes scope discipline. Phase 7 is
**aggressively about saying no to anything that isn't needed for release**.
Nice-to-haves get parked for a feedback-driven Phase 8+. The bar for
inclusion: "would I be uncomfortable shipping without this?"
 
---
 
## Substep structure
 
Unlike prior phases, Phase 7 substeps are loosely ordered by category, not
by sequential dependency. Within each category, items can usually be done
independently. The recommended overall order is **critical bugs → release-
blocking features → UI polish → production readiness**, since the first
two are the ones that would actually block a release.
 
---
 
## A — Critical bugs
 
These ship-blockers should go first. Each is a small fix once diagnosed.
 
### A.1 — Trends "All" range shows zeros for older data
 
**Symptom:** With ~7 years of data (July 2019 → March 2026), the "All"
timeframe on the trends page shows zero spending for every month before
roughly March 2025, despite those months having real transactions. The
"Tracking since July 2019" label is correct, so the earliest-month query
works.
 
**Diagnosis (with high confidence):** PostgREST's default row limit is
1000. `useMonthlyTotals` fetches transactions in the range and aggregates
client-side. With more than 1000 transactions in the range, the response
silently truncates to the most recent 1000, leaving older months with no
rows to aggregate.
 
**Fix:** Add a server-side aggregation. Write a Postgres function (or
view) that returns `(year_month, total)` for a budget over a date range,
pre-aggregated. The client fetches ~80 rows instead of thousands.
Bonus: this is also much faster than client-side aggregation at scale.
 
```sql
create or replace function public.budget_monthly_totals(
  b_id uuid,
  start_date date,
  end_date date
) returns table (year_month text, total numeric)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', t.date), 'YYYY-MM') as year_month,
    sum(t.amount) as total
  from public.transactions t
  where t.budget_id = b_id
    and t.date >= start_date
    and t.date <= end_date
    and public.is_budget_member(b_id)   -- enforce RLS manually since security definer bypasses
  group by 1
  order by 1;
$$;
```
 
Then refactor `useMonthlyTotals` to call `supabase.rpc('budget_monthly_totals', ...)`.
 
Same pattern for `useMonthlyCategoryTotals` — returns
`(year_month, category_id, category_name, total)` and is similarly cheap
server-side.
 
**Test:** the existing pure-logic tests on `aggregateByMonth` and
`aggregateByCategoryAndMonth` may become obsolete (the aggregation moves
to SQL). Keep `fillMonthGaps` and `resolveTimeframe` tests; they still
apply.
 
### A.2 — Donut chart center hidden by hover overlay
 
**Symptom:** On the month view, the breakdown donut's center (where a
total would naturally sit) is obscured by the hover tooltip on every hover.
 
**Two possible fixes, user must choose:**
 
1. **Remove the donut.** The bar chart next to it already shows the same
   information more legibly. If the donut isn't earning its space, kill it.
   Removing also reclaims room for the categories-list and makes the
   month view less busy.
2. **Reposition the tooltip.** Move it outside the donut footprint (top-
   right of the chart, or attached to the legend) so it never covers the
   center label.
Phase 6's portfolio overview donut already chose option 1's spirit — no
center label, totals live in their own cards. Doing the same for the
month view (either by removing the donut or putting the total in a
sibling card) is the consistent answer. **Recommendation: remove the
month-view donut.** The breakdown bar chart already does this job.
 
### A.3 — Static arrow positions on the Month header
 
**Symptom:** The prev/next arrows on the Month tab shift horizontally
because the month name's width varies ("May 2026" vs "September 2026").
 
**Fix:** Replace the current flex layout with `grid-cols-[auto_1fr_auto]`
or a fixed-width center column. The arrows anchor to the left and right
edges; the title centers within whatever space is left.
 
```tsx
<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
  <PrevButton />
  <h2 className="text-center">{formatMonthLabel(yearMonth)}</h2>
  <NextButton />
</div>
```
 
Same fix applies if the day header has the same problem (likely it does).
 
---
 
## B — Release-blocking auth & data-lifecycle features
 
Things that need to exist before a stranger uses the app. The first three
items on the user's list fall here, plus two that didn't make the list
but should.
 
### B.1 — Password change
 
A Settings → "Change password" form. Current password (required by
Supabase for security), new password, confirm. Calls
`supabase.auth.updateUser({ password })`. Success toast, error inline.
 
### B.2 — Forgot password / password reset
 
**Flag for the new chat to verify:** Supabase Auth has a built-in
"forgot password" flow, but the app might not have wired up the
client-side reset page. If the auth page doesn't have a "Forgot
password?" link that triggers `supabase.auth.resetPasswordForEmail`,
this is missing and must be added.
 
Flow:
1. "Forgot password?" link on the sign-in page
2. Modal or page accepts email, calls `resetPasswordForEmail`
3. Email sent by Supabase with a magic link to a new "reset" route
4. Reset route accepts new password, calls `updateUser({ password })`
5. Redirects to sign-in
Edge case: the user may currently be in a state where they can sign in
with magic links *only*. The password change/reset flow only makes
sense for password-authed users. Add a check.
 
### B.3 — Account deletion
 
Settings → Danger zone → "Delete account". Confirmation requires typing
the user's email to enable the delete button. On confirm:
1. Delete all budgets the user owns (cascades to everything in them via
   existing FK constraints).
2. Delete all portfolios the user owns (already user-scoped).
3. Remove user from any budgets they're a member of.
4. Call `supabase.auth.signOut()`.
5. Call a deletion RPC that triggers `auth.admin.deleteUser(uid)` —
   needs an Edge Function with service role privileges, similar to the
   invite flow but for deletion.
**Defer-or-include decision worth raising:** account deletion via Edge
Function is real work. For a soft launch among family and a couple of
friends, you might not need actual account deletion in v1 — a "request
account deletion" mailto link is acceptable for a few weeks. Default
recommendation: include the real flow, but it's worth confirming with
the user before building.
 
### B.4 — Permanent delete for archived items and categories
 
User's item 2. The archive flow today is one-way (no UI to un-archive,
no UI to truly delete). To clean up:
 
- Add an "Archived" toggle on the Manage page that reveals archived
  rows below the active ones.
- Each archived row gets a small action menu:
  - **Restore** — sets `is_archived = false`.
  - **Delete permanently** — opens a confirmation dialog that warns:
    "Deleting this category will also permanently delete every
    transaction logged under it (X transactions across Y days). This
    cannot be undone." Same for items, with the transaction count
    scoped to that item.
Counting transactions for the warning requires a small RPC or query.
The existing `useTransactions` patterns work but need a count variant.
 
DB-side: a category delete cascades to items (via FK), and item delete
cascades to transactions (via FK). The cascade is already wired; the UI
just needs to expose it with appropriate friction.
 
### B.5 — Budget rename and delete
 
User's item 3.
 
- **Rename:** add a "Budget settings" entry to the budget sidebar, or
  put it under the existing Manage page header. Simple form with the
  budget name. Calls a new `useUpdateBudget` mutation.
- **Delete:** danger-zone section on the same settings page. Confirm by
  typing the budget name. Warning: "Deleting this budget will
  permanently delete N transactions, M income entries, K savings
  entries, and all categories, items, people, and pending invites
  within it. This cannot be undone."
- Only owners can delete; RLS already enforces this. UI hides the
  control for non-owners.
- After deletion: navigate to `/app` (budgets home).
---
 
## C — UI polish
 
### C.1 — Visual design audit
 
User's item 5: "the app's UI feels a bit bad, address vibe-coded look,
gradients etc."
 
This is the largest substep by effort but the hardest to specify
upfront. Approach:
 
1. **Inventory pass.** Open every page in light and dark mode, take
   screenshots, list every place that feels off. Categorize: "vibe-
   coded" (random gradients, glossy effects, inconsistent radii),
   "amateur" (misaligned spacing, mismatched font weights), "tired"
   (looks 2019, not 2026).
2. **Reference pass.** Look at Linear, Notion, Cron, Stripe Dashboard,
   Things 3, Cal.com. Pick a target aesthetic. Hisaab's existing palette
   (Nova preset, Neutral base, Teal accents) is conservative — that's
   fine; lean into it rather than fight it.
3. **System pass.** Settle the design system before making per-page
   tweaks:
   - Radius scale (one or two values, not five)
   - Shadow scale (subtle, used sparingly)
   - Spacing scale (Tailwind defaults are fine; the issue is usually
     inconsistent application)
   - Typography scale (heading vs body vs caption — fewer steps is
     better)
   - Border weights (1px everywhere is usually right; 2px reserved for
     focus rings)
4. **Apply pass.** Go page by page. Day view, Month view, Trends,
   Manage, Portfolio overview, Holdings, Settings, Members, auth
   pages, landing.
**Skills to lean on heavily:** `frontend-design`. It's purpose-built
for exactly this work.
 
**Anti-goal:** introducing complexity. The fix for "vibe-coded" is
usually *less* — fewer gradients, fewer colors, less ornamentation. A
boring app that loads fast and reads clean beats an exciting app that
looks like every other AI-coded project.
 
**Time budget:** plan 2-3 sessions. This is the substep most likely to
balloon. Set a hard limit.
 
### C.2 — Login / signup redesign
 
User called this out separately. The auth page is the first impression.
Same target as C.1 (Linear, Stripe, etc.) but applied with extra care
since this is the front door. A single-column layout with the form
centered, a small logomark, a clean illustration or muted background
panel, and nothing else. Magic-link option prominent if the app supports
it (Phase 4 deferred this decision).
 
### C.3 — Empty state audit
 
Quick pass through every page that can be empty:
- Budgets home with no budgets
- Day view with no transactions
- Month view with no transactions / no income / no savings
- Trends with no history
- Manage with no categories
- Manage with categories but no items
- Members with no other members
- Portfolio home with no portfolios
- Portfolio overview with no holdings
- Holdings page with no holdings in a class
- Settings (always has content, skip)
Each should have a clear primary action ("Add your first X") and brief
explanatory copy. Most exist already; this is verification + polish.
 
### C.4 — Loading state consistency
 
Audit: every async surface should use the established pattern
(skeletons, not spinners; spinners only on in-flight mutations). Mostly
correct already, but quick re-check during the visual audit.
 
### C.5 — Mobile pass
 
Phase 5.9 cut this. Phase 6.8 did a light pass during stress-testing.
Phase 7 finishes the job:
 
- Walk every page at ~375px width.
- Tap-target sizes (44px minimum for primary actions).
- Header/sidebar/drawer behavior — confirm drawers close on nav, don't
  block scroll.
- The entry form on mobile (Phase 5 noted "pinned entry form" as a
  possible add; revisit only if it feels needed).
- Charts: ResponsiveContainer is set up, but verify Recharts label
  positioning at narrow widths.
- Date pickers and dropdowns on touch — Radix handles this well, but
  test.
---
 
## D — Workflow improvements
 
### D.1 — Category deselector on Month tab
 
User's item 8. On the month view's category breakdown, allow toggling
individual categories on/off so a single dominant category doesn't
flatten the rest of the view.
 
UI: a list of category chips above (or beside) the bar chart, each a
toggle. Off = excluded from the breakdown total, bar chart, and donut.
The variance card and summary stay budget-wide (they're not the
breakdown).
 
State lives in component-local React state, not URL — toggles are
session-ephemeral.
 
A small visual indicator when one or more categories are excluded
("Excluding 1 category" with a "Show all" link).
 
### D.2 — Whole-portfolio progression chart
 
Deferred from Phase 6. Now that the `holding_value_history` table has
been accruing data, the chart can be built:
 
- Sum all holdings' values at each point in history to get a single
  portfolio-total time series.
- Use the same chart shape as the per-holding history chart (line
  chart, dated points, hover tooltip).
- Lives on the portfolio overview page, above or below the allocation
  donut.
Pure logic: aggregate per-day-and-currency across all holdings, with the
FX blend applied if a rate is entered. Test-first (3-5 tests for the
aggregation, edge cases around currency mixing).
 
This is the most "feature" item in Phase 7 — push back if it feels like
scope creep relative to the polish goal. But it was a known Phase 6
deferral and the data is right there waiting.
 
---
 
## E — Production readiness
 
### E.1 — Error boundaries
 
Currently, an uncaught error anywhere in the React tree shows the
default Vite/React white screen with a stack trace — fine in dev, ugly
in production.
 
Wrap the route tree (or each major section) in an `ErrorBoundary` that
catches render errors and shows a friendly fallback ("Something went
wrong. Try refreshing. If it persists, contact us."). Log the error to
the console with enough context to debug.
 
React's built-in error boundaries are class components; there are
hooks-y wrappers like `react-error-boundary` that are cleaner. Either
works.
 
### E.2 — 404 polish
 
Make the "Not found" page actually nice — branded, with a link home.
Also catch the common cases: a budget id that doesn't exist or the user
doesn't have access to (currently shows whatever the failing query
shows; should be a clear "this budget doesn't exist or you don't have
access").
 
### E.3 — Performance pass
 
Quick check, not a deep optimization sprint:
- Trends page with 7 years of data — does it render fast after the A.1
  fix?
- The day view — virtualize the transaction list if it gets long? In
  practice, days have 10-20 transactions, so no.
- Bundle size: run `npm run build -- --report` (or `vite-bundle-visualizer`)
  and check if anything jumps out as bloated. Recharts is heavy; consider
  importing just the chart types in use rather than the umbrella package.
### E.4 — Final accessibility pass
 
Not aiming for full WCAG-AA compliance, but the basics:
- Every form input has an associated label
- All interactive elements are reachable by keyboard tab order
- Color contrast on text (the teal accent in dark mode may be borderline)
- ARIA labels on icon-only buttons (most are already done)
- Focus rings visible (shadcn defaults are good; just verify no
  accidental `outline-none` without replacement)
### E.5 — Sign-out everywhere
 
A minor but appreciated feature. In Settings, a "Sign out of all
devices" action that invalidates other sessions. Calls
`supabase.auth.signOut({ scope: 'global' })`.
 
---
 
## Out of scope for Phase 7 (deferred to feedback-driven Phase 8+)
 
These items came up but are explicitly *not* in this phase. They get
considered after release, when real usage tells us what actually matters:
 
- **Playwright end-to-end tests.** Cut from Phase 5.9, postponed in
  Phase 6.7. Still postponed. Better to ship and observe than to harden
  against speculative regressions.
- **Recurring transactions.** Real feature, not polish.
- **Receipt OCR / photo upload.** Real feature, not polish.
- **Portfolio share-level mode** (units, buys/sells, realized gain,
  dividends). Was always going to wait for real investing.
- **XIRR / CAGR for portfolio.** Same as above.
- **Multi-currency auto-FX** with live exchange rates. Manual blend rate
  is sufficient for v1.
- **Notifications** (push, email digest). No real workflow demand yet.
- **Bank or broker statement import.** Phase 5 covered the manual CSV
  import path; auto-fetching is its own large feature.
- **Budget targets / overspending alerts.** Mentioned in master plan,
  still not needed.
- **Persistent FX blend rate** on portfolio overview (Phase 6 known
  limitation). Trivial later if it becomes annoying.
---
 
## Decisions for the user to make before the new chat starts
 
Bundle these into the kickoff conversation. Each affects scope:
 
1. **Item 4 — donut chart.** Remove from month view entirely, or fix the
   tooltip positioning? Plan recommends remove.
2. **B.3 — account deletion.** Real implementation (Edge Function +
   cascade) or a "request deletion via email" mailto for v1? Plan
   recommends real, but soft launch can defer.
3. **D.2 — whole-portfolio chart.** Include in Phase 7 or defer? It's
   genuinely a feature, but the data exists and the implementation is
   bounded.
4. **C.1 — visual audit scope.** Hard time-box (2-3 sessions, ship what
   it ships) or scope it to specific pages? Plan recommends time-box.
5. **B.2 — password reset.** Verify the current state first: does the
   sign-in page have a "Forgot password?" link that works end-to-end? If
   yes, B.2 is a no-op. If no, it's a small addition.
---
 
## Patterns to reuse
 
Phase 7 is almost entirely reuse:
 
- Dual-mode forms and dual-control dialogs (Phase 2-6 pattern)
- Confirmation dialogs for destructive actions (existing
  `ArchiveConfirmDialog` extended, or a new generic one)
- Toast notifications via `sonner` (Phase 5)
- Cache key factories, mutation invalidation patterns
- Cents/paisa-based money math
- Skeleton loading states
- Pure-function calculations test-first, query hooks test-after
- Conventional Commits per substep
---
 
## New patterns introduced
 
Only one significant new thing:
 
- **Server-side aggregation via RPC** (A.1). First time we use a Postgres
  function for read-side aggregation rather than for security-definer
  helpers. Pattern: defines the function in a migration, exposes via
  `supabase.rpc('name', args)`, types come from the regenerated
  `db.ts`. Establishes the pattern for any future heavy-aggregation
  needs.
Plus, if B.3 (account deletion) is included as a real implementation, a
second Edge Function joins `invite-to-budget` from Phase 4. Same
pattern, different verb.
 
---
 
## Test count target
 
Phase 7 is light on pure logic — most work is UI and data lifecycle. New
tests will come from:
 
- Whole-portfolio aggregation (D.2): 3-5 tests
- Any new pure helpers from the visual audit: maybe 0-3
Target: 5-10 new tests. End-of-Phase-7 total: ~271-276.
 
The real verification for Phase 7 is **manual walkthrough on every
flow, on desktop and mobile, in light and dark mode**, before declaring
release-ready.
 
---
 
## Estimated effort
 
8-12 sessions, distributed roughly as:
 
- A — Critical bugs: 1-2 sessions (A.1 is most of this)
- B — Auth & data lifecycle: 3-4 sessions (B.3 alone is one if real)
- C — UI polish: 3-4 sessions (most variable; C.1 dominates)
- D — Workflow improvements: 1-2 sessions
- E — Production readiness: 1 session
This is the longest planned phase since Phase 2. Justified because it's
the last one before the gate.
 
---
 
## Definition of "release-ready" (what closes Phase 7)
 
Before declaring Phase 7 complete:
 
- [ ] Every item in A is fixed and verified with real data
- [ ] Every item in B is shipped or explicitly deferred with the user's
      agreement
- [ ] The visual audit has reached an "I'd show this to my brother"
      threshold
- [ ] Every destructive action has a confirmation dialog with the
      consequence spelled out
- [ ] Error boundaries catch render errors gracefully
- [ ] Mobile walkthrough completed at 375px
- [ ] No console errors or warnings during normal use
- [ ] The 7-year historical dataset renders without lag
Then: master plan flips Phase 7 to done, `Phase_7_complete.md` is
written, the app is deployed to production, and the developer starts
using it daily.
 
---
