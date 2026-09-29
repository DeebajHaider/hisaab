# Future work
 
The app shipped at the end of Phase 7. This document is the parking lot — what was deferred, what was identified along the way as "worth doing eventually," and what could materially improve usability if priority surfaces.
 
Items are organised by category, not priority. Within each category, items are roughly ordered by how likely they are to actually matter in daily use.
 
A note up front: this is a personal/family-scale app. Some items that would be table stakes for a commercial product (E2E tests, sub-second performance budgets, full accessibility compliance) sit lower than they would otherwise. If the app ever moves toward wider distribution, those re-prioritise.
 
---
 
## Deferred from earlier phases
 
These are explicit deferrals from work that was planned but not delivered. Each has a known shape and a clear path to completion.
 
### Visual design audit (Phase 7-C)
 
**Status:** dropped at user request to ship faster.
**Effort:** 2–3 focused sessions.
**Description:** Inventory pass across every page in light and dark mode. Settle the design system before per-page tweaks — radius scale, shadow scale, spacing rhythm, typography scale, border weights. Then apply page by page. Day view, Month view, Trends, Manage, Portfolio overview, Holdings, Settings, Members, auth pages, landing.
 
Anti-goal is adding complexity. The fix for "vibe-coded" is usually less, not more. References: Linear, Stripe Dashboard, Things 3. Use the `frontend-design` skill heavily.
 
This is the most user-visible deferred item. Worth doing before showing the app to anyone outside the immediate family.
 
### Forgot password / password reset (Phase 7-B.2)
 
**Status:** code written, then reverted because Supabase email is not configured.
**Effort:** half a session.
**Description:** Configure an email provider (Resend is the obvious choice for the free tier), whitelist `/reset-password` in Supabase redirect URLs, then un-revert the original commit. The flow itself is correct; it just can't be tested or used without a working SMTP path.
 
Worth doing before anyone outside the developer creates an account, because the developer is the only one who can reset their own password via the SQL editor.
 
### Whole-portfolio progression chart (Phase 6-D.2, Phase 7-D.2)
 
**Status:** deferred twice. Data has been accruing in `holding_value_history` since Phase 6.7.
**Effort:** one session.
**Description:** Aggregate holding values by date across all holdings in a portfolio, with the FX blend applied for non-base currencies, to produce a single portfolio-total line chart. Mirror the per-holding chart already on the holdings page.
 
Worth doing when real investing starts. Without an active portfolio, it's a chart of mock data.
 
### Inline taxonomy creation (deferred from Phase 5)
 
**Status:** mentioned as future polish; never built.
**Effort:** one session.
**Description:** In the transaction entry form, when a user types a search query that doesn't match any existing item, surface an "Add new item" affordance directly in the dropdown. Same for a new category if the relevant dropdown returns nothing. Goal: never leave the day view to add a one-off item.
 
Lower-impact than it sounds — most users will set up their taxonomy once and then live in the entry flow, and the manage page is one click away. But genuinely nice when it does come up.
 
### Playwright E2E tests (deferred since Phase 5.9)
 
**Status:** repeatedly deferred. Vitest unit tests cover ~273 cases of pure logic; the integration glue is uncovered.
**Effort:** 2–3 sessions to set up and write the first batch of high-value flows.
**Description:** Stand up Playwright. First flows to cover: sign up → create budget → import template → log transaction; archive then permanently delete a category with confirmation; ownership transfer; account deletion with shared-budget blocker; the portfolio entry flow.
 
Highest leverage in catching regressions that unit tests miss — the kind of cross-cutting bugs that come from changing query patterns or RLS policies. Lower priority for a family-scale app; rapidly becomes essential if the app grows beyond that.
 
### Performance pass (Phase 7-E.3)
 
**Status:** skipped in the interest of shipping.
**Effort:** half a session.
**Description:** Run a bundle report (`vite-bundle-visualizer` or similar) and look for obvious bloat. Recharts is the most likely culprit — switch from umbrella imports to per-chart imports if it's significant. Measure trends render time with the full 7-year dataset and confirm it's snappy.
 
The A.1 fix in Phase 7 (server-side aggregation) already addressed the biggest known issue. This pass is hunting for unknown ones.
 
### Accessibility pass (Phase 7-E.4)
 
**Status:** skipped.
**Effort:** one session.
**Description:** Verify every form input has an associated label, every icon-only button has an aria-label, focus rings are visible (no orphaned `outline-none`), color contrast on text passes WCAG-AA (the teal accent in dark mode is borderline), keyboard navigation reaches everything. Not chasing full compliance — just the basics.
 
Worth doing before the app is used by anyone who relies on assistive tech, which is impossible to predict.
 
---
 
## Genuinely missing functionality
 
Things the app cannot do today that a reasonable user would expect.
 
### Recurring transactions
 
The biggest functional gap. Rent, utility bills, salary, subscriptions — these get logged manually every month even though they're predictable.
 
**Shape:** a `recurring_transactions` table with the same shape as `transactions` plus a recurrence rule (monthly on day N, weekly on day-of-week, etc.) and a "last generated through" cursor. A scheduled job (Supabase scheduled function or a daily cron) generates the actual transaction rows from the rule on the appropriate date. The user can edit each generated transaction individually after the fact.
 
**Effort:** 2 sessions.
**Priority:** high. Materially reduces the friction of monthly book-keeping.
 
### Budget targets and overspending alerts
 
A target amount per category per month, with the variance shown alongside the actuals.
 
**Shape:** a `category_targets` table with `(category_id, year_month, target_amount)`. Display: a target column on the category breakdown card, a visual cue (color, bar fill) when the actual exceeds the target. Optional: a banner on the month view when one or more targets are exceeded.
 
**Effort:** 1.5 sessions.
**Priority:** medium. Mentioned in the master plan as Phase 5+ work; never built. Useful for people actively budgeting (vs just tracking).
 
### Receipt photo upload and OCR
 
Take a photo of a receipt, parse the merchant and amount, pre-fill the entry form.
 
**Shape:** Supabase Storage for the image, an Edge Function that calls an OCR service (Google Vision API or similar) for parsing, a confidence threshold below which the user just sees the raw image and fills in manually.
 
**Effort:** 2–3 sessions, plus ongoing cost for the OCR API.
**Priority:** low for personal use, high if the app ever has casual users. The friction of typing every transaction is real for receipt-based shopping; the friction of pulling out the phone, taking a clear photo, waiting for OCR, and correcting mistakes is also real. The net value depends on individual habits.
 
### Bank / broker statement imports
 
Beyond the existing CSV taxonomy importer — actually parse a bank statement (PKR or USD) into transactions.
 
**Shape:** per-bank parsers (each bank's format is slightly different). PSX broker statements for the portfolio side. Mapping UI to assign incoming rows to categories. Deduplication against already-imported transactions by date + amount + source.
 
**Effort:** 1 session per bank format, plus a generic mapper.
**Priority:** medium-to-high for an active investor or someone who already keeps every receipt. Low for someone who logs transactions in real time anyway.
 
### Multi-currency auto-FX
 
Currently the portfolio's blended PKR total uses a manually entered FX rate, persisted only in component state. The budgeting side has a single currency per budget.
 
**Shape:** a daily FX rate fetcher (Edge Function calling exchangerate.host or similar, free tier), persisted rates in a small `fx_rates` table indexed by `(base, quote, date)`, lookup helper that uses the rate from the relevant date for historical accuracy.
 
**Effort:** 2 sessions including the fetcher, error handling, and UI.
**Priority:** low until cross-currency tracking becomes genuinely active.
 
### Date editing inside the edit-transaction dialog
 
The edit-transaction dialog currently doesn't expose a date field. To move a transaction to a different day, the workaround is delete-and-recreate.
 
**Effort:** one substep, maybe an hour.
**Priority:** low. The friction is real but rare. Logging on the right day is the default behaviour.
 
### Per-person summaries with avatars
 
Per-person totals exist on the month summary, but they're text. Linking a `Person` to an `auth.users` account (for households where everyone has their own login) would let the UI show real names and avatars next to per-person totals.
 
**Shape:** an optional `auth_user_id` on the `people` table; a join in the summary query; the existing initials helper renders the avatar.
 
**Effort:** half a session.
**Priority:** low. Cosmetic.
 
### Sign out of all devices is not instantaneous
 
A known limitation from Phase 7-E.5. The `signOut({ scope: 'global' })` call requires a server round-trip and depends on token expiry for sessions on other devices. Not a bug — just slow.
 
A genuine fix would require Supabase to add immediate revocation server-side. Watch their changelog; nothing to do on the app side.
 
---
 
## Workflow quality-of-life
 
Smaller items that wouldn't show up in a feature comparison but make the app nicer to live with.
 
### Keyboard shortcuts
 
The search-first transaction entry is already keyboard-friendly. A few global shortcuts would round it out:
 
- `n` to focus the new-transaction search box
- `g d` to go to the day view, `g m` for month, `g t` for trends, `g s` for settings
- `Cmd/Ctrl+K` for a command palette
**Effort:** one session for the shortcuts plus the command palette.
**Priority:** low until the app is used heavily; high once it is.
 
### Mobile pinned entry form
 
On mobile, the entry form scrolls below the day's transaction list. After logging the day's first item, the user has to scroll past the new transaction back to the input.
 
**Shape:** the entry form pins to the bottom of the viewport on mobile while the transaction list scrolls above it.
 
**Effort:** half a session, mostly CSS.
**Priority:** medium for daily mobile users. Less for users who log on desktop or in batches.
 
### Persistent FX blend rate per portfolio
 
Known limitation from Phase 6. The blend rate entered on the overview is component state; refresh and it's gone.
 
**Shape:** persist on the `portfolios` row (`base_currency`, `fx_rate_to_base`, `fx_rate_at`). The overview reads and writes through a small mutation.
 
**Effort:** half a session.
**Priority:** low until it's annoying.
 
### CSV export
 
The CSV import path (Phase 5) reads taxonomies and transactions in. The reverse — exporting a budget's data — doesn't exist. Useful for offline backup, accountant handoff, or analysis in Excel.
 
**Shape:** per-month export endpoints generating CSV for transactions, income, savings; per-budget export bundling everything. Done client-side from existing queries (no new endpoint needed).
 
**Effort:** one session.
**Priority:** medium. Comes up the first time someone asks "can I get my data out?"
 
### Offline mode
 
The app currently requires an internet connection. For mobile-first usage in spotty connectivity, queuing entries locally and syncing when online would help.
 
**Shape:** IndexedDB queue for mutations, replay on reconnect, optimistic UI for the queued items. Real complexity around conflict resolution if two devices both queue an edit to the same transaction.
 
**Effort:** 3+ sessions, with non-trivial edge cases.
**Priority:** low. Personal-scale usage rarely hits this pain.
 
---
 
## Portfolio depth
 
All explicitly deferred from Phase 6 until real investing starts. The data model can absorb most of these without schema changes; the calculations and UI are the work.
 
### Share-level mode
 
The current value-tracked model holds two numbers per holding (invested, current value). Active equity investing benefits from the unit-priced model — quantity, average cost, current price per unit, realised gain on partial sales, dividends as separate events.
 
**Shape:** an optional per-holding mode flag. Value-tracked stays the default; unit-priced unlocks columns for units, average cost, last price per unit. A new `holding_transactions` table for the buy/sell/dividend ledger.
 
**Effort:** 3–4 sessions.
**Priority:** depends entirely on whether the user starts active equity trading.
 
### XIRR / annualized return
 
CAGR isn't enough when cash flows are irregular (which they always are for retirement contributions, dollar-cost averaging, etc.). XIRR is the industry-standard metric.
 
**Shape:** Newton's method root finder applied to dated cash flows. A library is recommended (the algorithm is finicky around convergence). Display: an annualized return chip on the portfolio overview and each holding card.
 
**Effort:** one session if using a library, two if implementing.
**Priority:** medium once a portfolio is real. The progression chart is the visual; XIRR is the headline number.
 
### Dividend tracking
 
Dividends are currently impossible to capture cleanly. Adding the unit-priced mode (above) would address this; in the meantime, they go in as "add investment" with a note.
 
**Shape:** see share-level mode.
 
### Income-yielding instruments
 
National Savings (DSC, Pakistan Investment Bonds, RIC), fixed deposits, recurring deposits — these have a known maturity date and known payouts. Modelling them as holdings with periodic dividend transactions works; a dedicated "instrument" type with maturity date and scheduled payouts would model them better.
 
**Shape:** an `instruments` table with `maturity_date`, `interest_rate`, `payout_frequency`, plus calculations for accrued interest. Holdings can reference an instrument for these fields.
 
**Effort:** 2 sessions.
**Priority:** medium if PIBs or DSCs are part of the portfolio; low otherwise.
 
### Tax-aware reporting
 
Realized capital gains by tax year, dividend totals by tax year, possibly cost-basis methods (FIFO/LIFO/specific-ID).
 
**Shape:** taxes are jurisdiction-specific and brittle. Best implemented as a pure calculations layer over the transaction ledger (which doesn't exist yet — see share-level mode).
 
**Effort:** 2 sessions for the calculations, more for UI.
**Priority:** depends on personal need. Pakistan's individual capital gains regime is light; this matters more for US-based investing.
 
---
 
## Architecture and technical debt
 
Not user-visible but worth noting.
 
### Migration hygiene
 
Seven phases of migrations means some are large and some are tiny fixes. Squashing them into a single "production schema" migration would make it cleaner for someone setting up a fresh database; the trade-off is losing the historical record of decisions and reverts.
 
Don't squash unless there's a specific reason to.
 
### Type safety at the database boundary
 
`src/types/db.ts` is regenerated by `supabase gen types`. It's typed, but the joins in TanStack Query hooks often need manual narrowing (`as unknown as Joined<T>`). Patterns work, but they're not idiomatic.
 
A more disciplined approach with [zod](https://zod.dev) or [type-fest](https://github.com/sindresorhus/type-fest) validation at the boundary would tighten this. Cost: code volume. Benefit: catches schema-drift bugs earlier. Currently not worth it for a personal app.
 
### Mutations don't return inserted rows
 
A known workaround for an RLS evaluation timing bug. The workaround is correct, but it means every create flow has a "wait for the list to refetch" UX delay. Could be hidden with optimistic updates in TanStack Query.
 
**Effort:** unclear; one session to try, possibly more to handle every edge case.
**Priority:** low. The delay is fast enough that the UX is fine.
 
### Edge Function reduction
 
Phase 4 introduced `invite-to-budget` as the first Edge Function. Phase 7 considered Edge Functions for account deletion but landed on a Postgres RPC instead. There's room to reconsider whether the invite Edge Function could similarly move into an RPC — fewer moving parts.
 
**Effort:** one session to convert and test.
**Priority:** very low. The current implementation works.
 
### Realtime granularity
 
Phase 4 subscribed to every per-budget resource from `BudgetLayout` for simplicity. At scale, this could be wasteful — most pages care about a small subset. Per-page subscriptions would be more efficient.
 
**Priority:** very low until concurrent users push into the hundreds.
 
---
 
## Things that should probably never be added
 
Sometimes the right design decision is to permanently park something. These would be worth saying no to explicitly if they come up.
 
- **Cross-budget rollups.** "Show me my total spending across my personal budget and my family budget." Tempting, but it conflates accounts that have different sharing semantics. Better to keep budgets distinct and accept the answer lives in two places.
- **Comments or threads on transactions.** A family budget isn't a forum. Notes field exists; that's enough.
- **Social features.** Comparing your spending to peers, leaderboards, sharing publicly. Not what this app is for.
- **AI-assisted categorisation.** Tempting and fragile. Categories are already pre-defined for the budget; the marginal value of guessing is low while the failure modes are confusing.
- **Forecasting / budgeting models.** Some apps project next month's spending based on past patterns. Useful in theory, statistically dubious for individuals with small sample sizes. Targets (above) are the cleaner answer.
---
 
## How to prioritise this list
 
Rough framework if multiple items become candidates simultaneously:
 
1. **Friction-reducing items above feature-adding items.** Recurring transactions saves time every month forever; receipt OCR is interesting but only saves time if photo capture is genuinely faster than typing.
2. **Things blocking other people above things blocking only the developer.** Forgot password and the visual audit are higher priority once family members are using the app daily.
3. **Quick wins above long projects.** Persistent FX blend rate, mobile pinned form, date editing in the dialog — half-session items that materially improve daily use.
4. **Don't optimise empty workflows.** Portfolio depth features only matter when there's a real portfolio. Bank imports only matter when manual entry is the bottleneck. Build for actual habits, not hypothetical ones.
The next thing to actually do is probably the **visual design audit** — it's the most visible part of the app, the deferral is recent, and the family-launch threshold benefits from it more than anything else on the list. After that, **recurring transactions** is the highest-friction-reducing feature missing.
 
Everything else can wait for real usage to surface a real need.
