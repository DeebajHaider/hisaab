# Hisaab — Master Roadmap

The full development plan, all phases. This document is the source of truth for
what's planned vs. what's done. Update phase status as work progresses.

---

## Vision

A web app for personal and family budgeting that replaces a Google Sheet
workflow. Multi-user (sharing a family budget). Mobile- and desktop-friendly.
Eventually includes a portfolio tracking module.

Two distinct functional surfaces:

1. **Budgeting** — log expenses against categories/items, track income and
   savings, view monthly summaries and trends. Daily/weekly use.
2. **Portfolio** — holdings, principals, profits, dividend dates, financial
   calculator. Monthly/quarterly use. Built last because lower-frequency.

---

## Stack

| Layer       | Choice                                                      |
| ----------- | ----------------------------------------------------------- |
| Frontend    | React + Vite + TypeScript                                   |
| Styling     | Tailwind 4 + shadcn/ui (Radix primitives, Nova preset)      |
| Charts      | Recharts (added in Phase 3)                                 |
| Data        | TanStack Query + supabase-js                                |
| Backend     | Supabase (Postgres + Auth + RLS), no Express layer          |
| Hosting     | Vercel (frontend), Supabase cloud (backend)                 |
| Routing     | React Router 6 with nested layouts                          |
| Testing     | Vitest + React Testing Library; honest-mix TDD              |

**No Express layer.** React app talks to Supabase directly via supabase-js.
Auth via Supabase Auth, multi-user permissions via Row Level Security policies
in Postgres. Future server-side logic (scheduled jobs, exports, email) can be
added via Supabase Edge Functions or a thin Express service later.

**Honest-mix TDD.** Strict TDD on pure logic (calculations, parsers, ranking
algorithms, formatters). Test-after on query hooks. Skip tests for layout
components and page wiring. End-to-end tests deferred to a later polish phase.

---

## Phase status overview

| Phase | Topic                                     | Status      |
| ----- | ----------------------------------------- | ----------- |
| 1     | Foundations: auth, layout, budgets list   | ✓ done      |
| 2     | Categories, items, transactions, day view | ✓ done      |
| 3     | Month view, charts, income, savings, variance | planned |
| 4     | Sharing: invites, members, person attribution | planned |
| 5     | Polish: CSV export, real-time updates, edge cases | planned |
| 6     | Portfolio module                          | deferred    |
| 7+    | Long-tail features                        | not planned |

Each phase is independently shippable.

---

## Phase 1 — Foundations *(complete)*

Goal: authenticated user can sign up, see their budgets list, create a budget.

Delivered:

- Vite + React + TS project with Tailwind 4 + shadcn/ui (Radix, Nova preset, Neutral palette)
- Auth via Supabase Auth: sign up, sign in, sign out, persistent sessions
- Theme provider with light/dark/system, persisted to localStorage
- `AuthProvider` + `useAuth` hook, `RequireAuth` route wrapper
- App layout shell: header with theme toggle and user menu
- Landing page (public, marketing) with feature visuals
- TanStack Query setup with devtools
- 8-table Postgres schema with referential integrity
- RLS policies on all tables (helper functions owned by `postgres` for `security definer`)
- `created_by` defaults to `auth.uid()` on every relevant table
- `useBudgets` query, `useCreateBudget` mutation
- Budgets home page with create dialog
- Vercel deployment plan documented (deferred until app is more usable)

Tests: 13 (percent-contribution, initials).

---

## Phase 2 — Categories, items, transactions, day view *(complete)*

Goal: a fully usable expense-logging loop. Set up taxonomy, log transactions,
review and edit by day.

Delivered:

- Budget detail layout: sidebar nav on desktop, drawer on mobile
- Smart redirect on `/app/budgets/:id` → Manage if empty, Day view if populated
- `useCategories`, `useItems`, `useBudget`, `usePeople` query hooks
- All taxonomy mutations (create/update/archive for categories and items)
- Tree-sort helper that groups items by category with secondary alphabetical sort
- Categories & items management page with collapsible tree
- Soft-delete (archive) for categories and items (preserves transaction history)
- **Cascade-archive** when archiving a category — all items inside also archived
- CSV import dialog with two paths: built-in template + user CSV upload
- Robust hand-rolled CSV parser (RFC 4180-ish: quotes, escapes, BOM, line endings)
- Import validator with row-numbered errors collected (not throw-on-first)
- Idempotent import semantics: re-running same CSV is a no-op; archived rows
  are restored when re-imported by name; existing rows are never overwritten
- Transaction CRUD hooks with proper cache key hierarchy via `transactionKeys`
- Day view: date navigation header (prev/next/today) with friendly labels
- Search-first transaction entry with custom keyboard-navigable combobox
- Browse-mode (category + item dropdowns) kept in sync with search via shared `selectedItemId`
- Mode toggle (lump vs rate × qty) with auto-computed amount in rate × qty mode
- Person picker on transactions in `tracks_person` categories
- Transaction list grouped by category with subtotals and day total
- Edit transaction in modal with form pre-filled (dual-mode form: `existing` prop)
- Delete transaction with confirmation
- Locale-aware number formatting (`toLocaleString`, tabular-nums)
- Floating-point-safe day total calculation (cents-based)

Tests: 86 total (parser 18, import validator 17, search ranking 16, day totals 8,
date helpers 14, others 13).

Deliberately *not* included (after weighing complexity vs use):
- Inline item creation from search (originally Phase 2.7) — deferred. If wanted
  later, the spec is in chat history.
- Drag-and-drop reordering for categories/items — deferred.

---

## Phase 3 — Month view, charts, income, savings, variance

Goal: monthly summaries that replace the right-hand panel of the original
spreadsheet, plus charts for trends.

See `hisaab-phase-3-plan.md` for substep-by-substep breakdown.

Estimated 5-6 sessions.

---

## Phase 4 — Sharing

Goal: family members can have their own accounts and contribute to a shared
family budget.

Substeps:

- 4.1 — Email-invite flow using Supabase Auth invites (or magic links if email
  confirmation is too high-friction)
- 4.2 — Members management page: list current members, change roles, remove
- 4.3 — People entity (Minhal, Deebaj, Batool, Ismat) for per-person tracking
  in tracked categories
- 4.4 — Per-person summaries on month view (already partly designed in schema)
- 4.5 — Real-time updates via Supabase channels so family sees each other's
  entries live (optional polish)
- 4.6 — Re-test RLS policies with multiple real users in the shared budget

Estimated 4-5 sessions.

---

## Phase 5 — Polish

Goal: round out the long tail of features that make day-to-day use feel solid.

Substeps:

- 5.1 — CSV export per month / per budget (mirror image of import)
- 5.2 — Inline category/item creation from entry form (revisit deferred 2.7)
- 5.3 — Date editing inside the edit-transaction dialog
- 5.4 — Empty-state polish across the app
- 5.5 — Toast notifications for mutation success/error (shadcn `sonner`)
- 5.6 — Keyboard shortcuts for power users (e.g., `n` to focus new-transaction search)
- 5.7 — Mobile-specific polish: pinned entry form, bigger tap targets, etc.
- 5.8 — End-to-end Playwright tests for critical happy paths

Estimated 3-4 sessions.

---

## Phase 6 — Portfolio module *(deferred)*

Goal: track investments alongside the budget.

Tables:

```
holdings              user_id, name, asset_class, principal, current_value, currency, opened_on
holding_transactions  holding_id, kind (buy/sell/dividend/profit), amount, date, notes
dividend_schedule     holding_id, expected_date, expected_amount, status
```

Pages:

- Portfolio overview: total value, gain/loss, asset allocation pie
- Holdings list with drill-down detail
- Dividend calendar (upcoming + history)
- Financial calculator (compound interest, SIP/installment returns, loan EMI —
  scope to confirm at build time)

Portfolio is per-user, not shared. Reuses auth, layout, theme.

Estimated 3-4 sessions.

---

## Out of scope (for now)

Documented so we don't rebuild discussions:

- Receipt photo upload / OCR
- Recurring transaction auto-generation
- Multi-currency conversion
- Budget targets / alerts on overspending
- Bank or SMS integration
- Push notifications
- Offline mode

These are reasonable future additions but each adds non-trivial complexity.
Each can become a Phase 7+ if and when needed.

---

## Build conventions

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- Migrations as version-controlled SQL files in `supabase/migrations/`
- Schema changes followed by `npm run types:supabase` to regenerate `src/types/db.ts`
- Mutations don't `.select()` returned rows (RLS gotcha) — they invalidate and refetch
- camelCase in TypeScript, snake_case in DB; explicit field-by-field translation
- Cache key factories per resource for consistent invalidation
- Forms support both create and edit modes via optional `existing` prop
- Dialogs support both controlled (`open` prop) and uncontrolled (internal state)

---

## What's tested vs not

Tested directly (pure logic, fast feedback):

- `lib/calculations/percent-contribution`
- `lib/calculations/day-totals`
- `lib/format/initials`
- `lib/format/date`
- `lib/format/tree-sort`
- `lib/import/csv-parser`
- `lib/import/template-import`
- `lib/search/rank-items`
- `queries/transaction-keys`

Not tested (UI wiring, integration glue, manual verification + future E2E):

- Components in `components/*`
- Routes in `routes/*`
- Auth provider, theme provider, RequireAuth
- Layout components

Database-side enforcement (covered by RLS policies, manually verified):

- Per-budget data isolation
- Owner-only budget membership management
- Editor-level write access for taxonomy and transactions
