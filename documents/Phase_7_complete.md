# Phase 7 — Complete
 
Polish, fixes, and release-readiness. The phase that takes Hisaab
from "works for the developer who built it" to "can be shown to
family members without embarrassment." Unlike prior phases, Phase 7
was a curated backlog of small things rather than one coherent
feature — critical bugs, release-blocking auth and data-lifecycle
work, workflow improvements, and production hardening.
 
---
 
## Scope delivered
 
By the end of Phase 7, Hisaab does the following that it couldn't before:
 
- Shows correct spending history on the Trends "All" timeframe even
  with 7+ years of data, by moving aggregation server-side via RPCs.
- Lets any user change their password via Settings → Security, with
  current-password verification before the update is applied.
- Lets a budget owner transfer ownership to another member, with an
  atomic RPC that swaps both roles in a single transaction.
- Lets a user delete their account — fully, atomically, including all
  owned budgets and portfolios — after a pre-flight check that blocks
  deletion if they still own shared budgets.
- Lets owners permanently delete archived categories and items, with
  a confirmation dialog showing the exact transaction count that will
  be lost.
- Lets owners rename a budget and delete it entirely from a per-budget
  Settings page, with a name-typing confirmation before the destructive
  action.
- Lets users hide individual categories from the month-view breakdown
  bar chart via chip toggles, with percentages recalculated relative
  to the visible subset.
- Catches render errors anywhere in the route tree with a friendly
  fallback instead of a blank screen.
- Shows a proper 404 page with a home link for unmatched routes.
- Signs out of all sessions on all devices from a single button in
  Settings → Sessions.
The app is now release-ready for a soft launch among family members.
 
---
 
## Substeps and outcomes
 
| Substep | Topic                                              | Outcome        |
| ------- | -------------------------------------------------- | -------------- |
| A.1     | Trends "All" showing zeros (PostgREST row limit)   | Done           |
| A.2     | Month-view donut chart tooltip bug                 | Done (removed) |
| A.3     | Shifting prev/next arrows on month and day headers | Done           |
| B.1     | Password change in Settings                        | Done           |
| B.2     | Forgot password / password reset                   | Reverted       |
| B.3     | Account deletion with ownership transfer           | Done           |
| B.4     | Permanent delete for archived items and categories | Done           |
| B.5     | Budget rename and delete                           | Done           |
| C.1–C.5 | Visual design audit                                | Deferred       |
| D.1     | Category deselector chips on month view            | Done           |
| D.2     | Whole-portfolio progression chart                  | Deferred       |
| E.1     | Error boundaries                                   | Done           |
| E.2     | 404 page polish                                    | Done           |
| E.3     | Performance pass                                   | Deferred       |
| E.4     | Accessibility pass                                 | Deferred       |
| E.5     | Sign out of all devices                            | Done           |
 
### B.2 — reverted
 
Forgot-password flow was written then reverted because Supabase email
is not configured. The reset page (`/reset-password`) and the
forgot-password mode on the auth page require a working email provider
(e.g. Resend). Revisit when email is set up — the code existed and
was correct, it just cannot be tested or used without a provider.
 
### C — dropped for this phase
 
The visual design audit was dropped at the user's request and deferred
to a separate session. The audit items (gradient/vibe-coded elements,
spacing consistency, typography scale, empty states, mobile pass)
remain valid future work but are not release-blocking.
 
### D.2 — deferred to Phase 8+
 
The whole-portfolio progression chart was deferred at the kickoff
decision meeting. The `holding_value_history` table continues to
accrue data since Phase 6. Build it when real investing begins.
 
### E.3 and E.4 — deferred
 
Performance pass and accessibility pass were skipped in the interest
of shipping. Neither is blocking for a soft launch with 4–5 known users.
 
---
 
## Architecture additions
 
### New database objects
 
Six migrations shipped in Phase 7:
 
| Migration | Contents |
| --------- | -------- |
| `add_monthly_aggregation_rpcs` | `budget_monthly_totals`, `budget_monthly_category_totals` — server-side aggregation RPCs that replace client-side aggregation hitting the PostgREST 1000-row limit |
| `add_ownership_transfer_and_account_deletion_rpcs` | `transfer_budget_ownership`, `get_owned_shared_budgets`, `delete_own_account` |
| `fix_nullable_created_by_for_account_deletion` | DROP NOT NULL on `transactions`, `income_entries`, `savings_entries`, `budgets`.`created_by` so the deletion sequence can null them out before removing the auth record |
| `fix_budget_invites_on_account_deletion` | Updated `delete_own_account` to delete `budget_invites` rows referencing the user via `invited_by` or `accepted_by` (both NO ACTION FKs) |
| `fix_transaction_fk_cascade_for_permanent_delete` | `transactions.category_id → categories` and `transactions.item_id → items` changed from RESTRICT to CASCADE so permanent category/item deletion propagates to transactions |
| `fix_last_owner_trigger_allows_budget_cascade` | `prevent_last_owner_removal` trigger now skips its check when the parent budget no longer exists, allowing cascade deletes during budget deletion |
 
All security-definer functions are owned by `postgres`.
 
### New routes
 
```
/app/budgets/:budgetId/settings    → BudgetSettings
```
 
### New pure helpers
 
| File | Purpose | Tests |
| ---- | ------- | ----- |
| `lib/calculations/pivot-category-totals.ts` | Reshapes narrow RPC rows (yearMonth × category) into the Recharts-wide `AggregateResult` shape; also derives category ranking by total spend | 7 |
 
### New query and mutation hooks
 
| Hook / file | Notes |
| ----------- | ----- |
| `use-owned-shared-budgets.ts` | Calls `get_owned_shared_budgets` RPC; used as pre-flight check for account deletion |
| `useTransferOwnership` (in `use-member-mutations.ts`) | Calls `transfer_budget_ownership` RPC; invalidates members and budgets caches |
| `useDeleteCategory` (in `use-category-mutations.ts`) | Hard DELETE on category; cascades through FK chain to items and transactions |
| `useDeleteItem` (in `use-item-mutations.ts`) | Hard DELETE on item; cascades to transactions |
| `use-budget-mutations.ts` | `useUpdateBudget` (rename) and `useDeleteBudget` (full cascade delete) |
 
`useArchiveCategory` and `useArchiveItem` updated to show "restored"
vs "archived" toast based on the `archived` input flag.
 
`useMonthlyTotals` and `useMonthlyCategoryTotals` refactored from raw
transaction fetches to `.rpc()` calls. `pivotCategoryTotals` handles
the client-side narrow→wide reshape for the category hook.
 
### New components
 
| File | Notes |
| ---- | ----- |
| `components/error-boundary.tsx` | Class-based ErrorBoundary; logs error + component stack; wraps the route tree in `App.tsx` |
| `routes/budget-settings.tsx` | Rename section + danger zone (delete budget); owner-only content |
| `routes/not-found.tsx` | Replaced bare text with FileQuestion icon, 404 number, heading, and Go home button |
 
### Modified files of note
 
- `routes/manage.tsx` — "Archived" toggle reveals `ArchivedSection` with Restore and Delete permanently per row; `PermanentDeleteDialog` fetches transaction count on open (`enabled: open` pattern)
- `routes/settings.tsx` — Sessions section (sign out all devices), Security section (password change), Danger Zone (account deletion with shared-budget blocker)
- `routes/members.tsx` — "Make owner" button on non-owner rows; `useTransferOwnership` wired with confirmation dialog
- `queries/use-member-mutations.ts` — `useTransferOwnership` added
- `components/charts/category-breakdown-card.tsx` — chip deselector toggles categories; visible percentages recalculate relative to the filtered total; donut removed (A.2)
- `components/transactions/month-header.tsx` — fixed-width label prevents arrow shift (A.3)
- `components/transactions/day-header.tsx` — fixed-width label prevents arrow shift (A.3)
- `components/layout/budget-layout.tsx` — Settings nav entry (SlidersHorizontal icon)
- `App.tsx` — `ErrorBoundary` wraps route tree; `BudgetSettings` route added
---
 
## Decisions worth remembering
 
### 1. Donut removed rather than patched (A.2)
 
The month-view breakdown donut was removed entirely rather than fixing
the tooltip-covers-center-label bug. The horizontal bar chart already
communicated the same information more legibly. Removing it also
reclaimed space and reduced visual noise — consistent with the deferred
C-section audit's anti-goal of adding complexity.
 
### 2. Ownership transfer blocks account deletion (B.3)
 
Account deletion follows the GitHub model: if you own shared budgets,
deletion is blocked and each budget is listed with a link to its
Members page to transfer first. Auto-transfer (promoting the
longest-existing editor) was considered and rejected — explicit is
better than automatic for irreversible actions affecting other people's
data. `budget_members.created_at` was deliberately not added in
Phase 5, so "longest-existing editor" is not determinable anyway.
 
### 3. delete_own_account uses direct auth.users DELETE (B.3)
 
Rather than an Edge Function calling `auth.admin.deleteUser`, the
deletion is a `security definer` function owned by `postgres` that
deletes directly from `auth.users`. This achieves genuine atomicity —
the entire sequence (portfolios, budget cleanup, created_by nulls,
auth record) is one Postgres transaction. Either everything is deleted
or nothing is. The trade-off: session invalidation on other devices
relies on token expiry rather than immediate revocation, which is
acceptable for a family-scale app.
 
### 4. transactions.category_id and item_id changed to CASCADE (B.4)
 
Both FKs were RESTRICT, which blocked permanent deletion of categories
and items even when explicitly intended. Changed to CASCADE so
deleting a category or item also removes all associated transactions,
matching the consequence described in the confirmation dialog.
 
### 5. created_by columns made nullable (B.3)
 
`transactions`, `income_entries`, `savings_entries`, and `budgets`
all had NOT NULL on `created_by`. The deletion sequence nulls these
out before removing the auth record, to prevent CASCADE from wiping
shared-budget data belonging to other members. The NOT NULL constraint
had to be dropped first. `created_by` was always an audit field, not
an ownership field — nullability is correct.
 
### 6. Server-side aggregation pattern established (A.1)
 
`budget_monthly_totals` and `budget_monthly_category_totals` are the
first read-side RPCs in the codebase (prior RPCs were all for
security-sensitive mutations). The pattern — Postgres function with
`stable`, `security definer`, manual `is_budget_member` guard, owned
by `postgres` — is now the established approach for any future query
that would otherwise hit the PostgREST 1000-row limit.
 
### 7. Sign out of all devices has inherent latency (E.5)
 
`supabase.auth.signOut({ scope: 'global' })` makes a server-side API
call to revoke all refresh tokens. A brief delay is inherent — this
is the round trip required to make the revocation work on other
devices. The loading state ("Signing out…") covers the UX. Switching
to `scope: 'local'` would be instant but would only clear the current
device.
 
---
 
## Known limitations carried forward
 
1. **Forgot password requires email provider.** The flow was built and
   reverted. Configure Resend (or another SMTP provider) in Supabase,
   whitelist `/reset-password` in redirect URLs, and un-revert the
   commit to activate it.
2. **Sign out of all devices is not instantaneous.** Server round-trip
   to Supabase auth is required. See decision #7 above.
3. **UI polish not addressed.** The visual design audit (C) was
   dropped. The app is functional and clean but still has some
   vibe-coded elements from earlier phases (gradients, inconsistent
   radii). A dedicated 2–3 session audit is the next aesthetic task.
4. **No whole-portfolio progression chart.** Deferred from Phase 6,
   still deferred. `holding_value_history` data is accruing.
5. **E.3 / E.4 not addressed.** Performance pass and accessibility
   basics were skipped. No known issues, but unverified.
---
 
## Test count
 
Phase 7 added 7 tests (`pivot-category-totals.test.ts`).
End-of-phase total: approximately 273.
 
The real verification for Phase 7 is a manual walkthrough of every
flow on desktop and mobile, in light and dark mode. The definition
of "release-ready" from the plan has been met:
 
- [x] Every A item fixed and verified with real data
- [x] Every B item shipped or explicitly deferred with agreement
- [x] Every destructive action has a confirmation with consequences spelled out
- [x] Error boundaries catch render errors gracefully
- [x] 404 is branded and navigable
- [x] Sign-out of all devices available
---
 
## Commits
 
Phase 7 shipped across the following conventional commits:
 
```
fix: fix trends "All" range showing zeros for older months
fix: remove month-view donut chart
fix: stabilise prev/next arrow positions on month and day headers
feat: add password change to settings
feat: add ownership transfer and account deletion RPCs
feat: add transfer ownership action to members page
feat: add account deletion to settings danger zone
fix: resolve FK constraints blocking account deletion
fix: resolve FK constraints blocking account deletion (budget_invites)
feat: add restore and permanent delete for archived categories and items
fix: change transaction FK delete rules to CASCADE for permanent delete
fix: allow budget cascade to bypass last-owner trigger
feat: add budget settings page with rename and delete
feat: add category deselector chips to month breakdown card
feat: add error boundary and polish 404 page
feat: add sign out of all devices to settings
docs: add Phase 7 completion report
```
 
---
 
## Master plan status change
 
In `hisaab-master-plan.md`, Phase 7 moves from `in progress` to `✓ done`.
 
---
 
## What's next
 
Phase 7 closes the planned roadmap. The app ships for daily use.
Further work is feedback-driven:
 
- **UI polish (was C)** — dedicated 2–3 session visual audit: radius
  scale, shadow scale, spacing consistency, typography, auth page
  redesign. Reference Linear, Stripe Dashboard, Things 3.
- **Forgot password (was B.2)** — configure Resend, whitelist the
  `/reset-password` URL in Supabase, un-revert the commit.
- **Whole-portfolio progression chart (was D.2)** — `holding_value_history`
  has been accruing data since Phase 6. Build when real investing starts.
- **Performance pass (was E.3)** — bundle report, Recharts import
  pruning if needed, trends render time with 7-year dataset.
- **Accessibility pass (was E.4)** — form labels, keyboard nav, teal
  accent contrast in dark mode, ARIA on icon-only buttons.
- **Playwright E2E** — cut from Phase 5.9, still pending. Good
  candidate for the first task of the next phase.
- **Inline taxonomy creation (deferred from Phase 5)** — add
  category/item from the entry form search combobox.
- **Phase 8+ long tail** — recurring transactions, receipt OCR,
  multi-currency auto-FX, budget targets, bank import, push
  notifications.
