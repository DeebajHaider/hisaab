# Phase 5 — Polish, CSV import/export, realtime, and carried-over work
 
This is the plan for Phase 5. Pair with `hisaab-master-plan.md` (roadmap),
`hisaab-architecture.md` (what's already built), `Phase_3_complete.md`, and
`Phase_4_complete.md` (the two most recent builds).
 
---
 
## Goal
 
Phase 5 is the "make it solid" phase. After Phases 1-4 the app is
functionally complete and multi-user. Phase 5 rounds out the long tail of
features that make day-to-day use feel finished, and lands the one feature
that matters most for actually adopting the app: **importing real
historical data from a CSV file.**
 
The original master plan frames Phase 5 as pure polish. In practice it
carries one heavyweight feature (CSV import of real data), the realtime
work deferred from Phase 4, and several smaller carried-over items. The
substep order below puts the high-value, high-risk work first so it isn't
crowded out by cosmetic polish.
 
By the end of Phase 5 you should be able to:
 
- Import your existing budgeting spreadsheet's data as real transactions,
  not just the category/item taxonomy.
- Export any month or whole budget back out to CSV.
- See family members' changes appear live, without manual refresh.
- Edit transaction dates, edit your own display name, and benefit from
  toast feedback, keyboard shortcuts, and mobile polish.
---
 
## Estimated effort
 
6-8 sessions of focused work, broken into 9 substeps. CSV import (5.1) and
realtime (5.4) are the two largest; the rest are smaller and reuse
established patterns.
 
---
 
## Build order
 
The order is deliberate: highest-value and highest-risk first, cosmetic
polish last, so that if the phase runs long the important things are
already done.
 
### 5.1 — CSV import of real transaction data
 
**This is the most important substep in the phase.** Phase 2 already
shipped a CSV importer, but it only imports the *taxonomy* — categories and
items — via a fixed template. It does not import actual transactions,
income, or savings. 5.1 is about getting real historical data in.
 
The existing infrastructure to build on:
 
- `lib/import/csv-parser.ts` — a robust hand-rolled RFC-4180-ish parser
  (quotes, escapes, BOM, line endings). Reusable as-is.
- `lib/import/template-import.ts` — `buildImportPlan` + the template
  sample. The *pattern* (validate-all, collect row-numbered errors,
  idempotent semantics) is the model to follow.
- `components/manage/import-dialog.tsx` — the two-tab import UI.
What 5.1 adds:
 
- A transaction-import path: parse a CSV of real expense rows and insert
  them as `transactions`.
- Column mapping. The user's spreadsheet will not match our schema exactly.
  We need a mapping step — either a fixed expected-header format documented
  clearly, or a UI that lets the user map their columns to our fields
  (date, category, item, amount, rate, qty, person, notes). Start with a
  documented fixed format; a mapping UI can be a later refinement if the
  fixed format proves too rigid.
- Resolving names to IDs. The CSV will have category names and item names
  as text; we need to resolve them to existing category/item IDs, and
  decide what to do when a name doesn't exist (create it on the fly, or
  reject the row). Recommendation: auto-create missing categories and
  items as part of the import, so a single CSV can bring in both taxonomy
  and transactions. This mirrors how the Phase 2 template import already
  restores archived rows by name.
- Person resolution for tracked categories — same name-to-ID problem.
- A dry-run preview: show the user what will be imported (N transactions,
  M new categories, K new items) and any row errors, before committing.
- Date parsing that is timezone-safe (use the existing `date.ts` helpers,
  never `new Date(string)` directly).
- Float-safe amount parsing — paisa-based, consistent with every
  calculation in the app.
**Decisions to lock in 5.1 (put these in the kickoff message):**
 
- Fixed CSV header format vs a column-mapping UI. Recommendation: fixed
  format for the first version, documented with a downloadable sample.
- Auto-create missing categories/items/people, or reject rows referencing
  unknown names. Recommendation: auto-create — it makes a single import
  bring in everything.
- Idempotency. Phase 2's template import is idempotent (re-running is a
  no-op). Transactions are harder — there's no natural unique key. Decide:
  is transaction import idempotent (needs a dedup strategy), or is it a
  one-shot the user runs once per file and is warned not to re-run?
  Recommendation: one-shot with a clear warning, plus the dry-run preview
  so mistakes are caught before commit.
- Income and savings import — same CSV with a type column, or separate
  files? Recommendation: separate files/tabs, since their shape differs
  from transactions.
**TDD here:** strong. The row parser, the name-resolution logic, the
validation/error-collection, and the dry-run plan builder are all pure
functions and should be test-first. Expect 15-25 tests for 5.1 alone.
 
### 5.2 — CSV export
 
The mirror image of import. Export a month, or a whole budget, to a CSV the
user can open in a spreadsheet.
 
- Export transactions for a date range (month or all-time) with category,
  item, person, amount, rate, qty, notes as columns.
- Optionally export income and savings too.
- Round-trip safety: a CSV exported by 5.2 should be re-importable by 5.1
  without data loss. This is a good correctness target and a good test.
- Generated client-side (a Blob download), no server needed.
**TDD here:** the CSV serialization (rows → CSV string, with correct
quoting/escaping) is pure and worth testing, especially the round-trip
property against the 5.1 parser.
 
### 5.3 — Date editing in the edit-transaction dialog
 
Carried from the master plan. Currently the edit-transaction dialog can
change everything except the date — to move a transaction to a different
day you'd have to delete and re-create it.
 
- Add a date field to the edit form (the create form is always "today" by
  context, so this is edit-only).
- Cache invalidation must target both the old and new day's keys so both
  day views update. The `transactionKeys` factory already invalidates at
  the `byBudget` level, so this likely works for free — verify.
### 5.4 — Realtime updates (deferred from Phase 4.5)
 
The Supabase channel subscription work deferred from Phase 4. The design is
sketched in `hisaab-phase-4-plan.md` section 4.5 and the decision is
recorded in `Phase_4_complete.md` decision #11.
 
- One `useBudgetRealtime(budgetId)` hook, mounted at `BudgetLayout`.
- Subscribes to `postgres_changes` for the budget's resources:
  transactions, income_entries, savings_entries, categories, items,
  people, budget_members, budget_invites.
- On any event, invalidate the matching TanStack Query cache keys — never
  merge payloads directly; let the query refetch with joins and RLS.
- Channel lifecycle tied to the hook's `useEffect`, keyed on `budgetId`.
- `items` has no `budget_id` column (it reaches the budget via
  `category_id`) — subscribe unfiltered and invalidate broadly, or accept
  cross-budget event noise. Negligible at family scale.
**Prerequisite — dashboard step:** Realtime must be enabled per-table in
the Supabase dashboard (Database → Replication). The subscription silently
receives nothing for tables not in the publication. This is a manual step,
not code.
 
**Known accepted tradeoff:** a client's own mutation invalidates its cache,
then the realtime event for that same write invalidates again — one extra
refetch. Tolerated rather than building origin-filtering
(`Phase_4_complete.md` known quirk #4).
 
When 5.4 ships, remove the "Updates aren't live" honesty note from the
budget sidebar.
 
### 5.5 — Person pre-selection fix in the edit-transaction dialog
 
Carried from Phase 4. A known display bug: editing a transaction in a
tracked category does not pre-select the assigned person in the picker
(`Phase_4_complete.md` known quirk #1). A fix was drafted in the Phase 4
chat but not committed:
 
- A `SelectValue` children fallback so the trigger shows the assigned
  person's name even before the people query resolves.
- A `peopleForPicker` list that appends the assigned person when they are
  archived, so editing a transaction tagged to an archived person doesn't
  silently drop them.
The underlying `person_id` is correct — this is display-only — but it
should be fixed because it makes editing tracked transactions feel broken.
 
### 5.6 — Display-name editing (Settings page)
 
Carried from Phase 4. The `profiles.display_name` column exists but has no
editing UI; member lists show email everywhere. Add:
 
- A small Settings page (route under `/app`, reachable from the user menu —
  the menu already has a disabled "Settings" item).
- A form to edit `profiles.display_name`. RLS already allows a user to
  update their own profile.
- Once names exist, member lists and avatars show name-with-email-fallback
  instead of email alone. `getInitials` already prefers display name.
### 5.7 — Toast notifications
 
Carried from the master plan. Mutations currently surface success/failure
inconsistently — some inline, some not at all. Add shadcn's `sonner` toast:
 
- Success toasts on create/update/delete/archive across the app.
- Error toasts replacing or supplementing the inline error text.
- Especially valuable for the import flow (5.1) and member actions (4.2).
### 5.8 — Inline category/item creation from the entry form
 
Carried from the master plan (originally deferred Phase 2.7). When logging
a transaction and the needed category or item doesn't exist yet, let the
user create it inline without leaving the entry form. The search combobox
already has a "+ Create new item" affordance in the landing-page mockup;
this makes it real.
 
### 5.9 — Cross-cutting polish
 
The genuinely cosmetic tail:
 
- Keyboard shortcuts for power users (e.g. `n` to focus the new-transaction
  search).
- Mobile polish: pinned entry form, bigger tap targets, narrow-screen
  layout review.
- Empty-state polish across the app.
- `budget_members.created_at` — optional. Only add the column (and a
  migration) if a join-date display or activity feed is actually wanted
  (`Phase_4_complete.md` known quirk #2).
- End-to-end Playwright tests for the critical happy paths — log a
  transaction, import a CSV, accept an invite. This is the master plan's
  5.8 item.
---
 
## Decisions to lock in before starting
 
Bundle these into the first message:
 
1. **CSV import format:** fixed documented headers vs a column-mapping UI.
   Recommendation: fixed format first, with a downloadable sample CSV.
2. **Unknown names on import:** auto-create missing categories/items/people
   vs reject those rows. Recommendation: auto-create.
3. **Import idempotency:** one-shot-with-warning vs a dedup strategy.
   Recommendation: one-shot, plus a dry-run preview.
4. **Income/savings import:** same file with a type column vs separate
   files. Recommendation: separate.
5. **Substep order:** confirm CSV import (5.1) goes first. It is the
   highest-value feature and should not be crowded out by polish.
6. **Realtime scope:** confirm subscribe-to-all-resources-from-BudgetLayout
   (the Phase 4 plan's recommendation) over per-page subscriptions.
---
 
## What's *not* in Phase 5
 
Deferred to Phase 6+ or out of scope entirely:
 
- The Portfolio module — that is Phase 6, a separate build.
- Receipt photo upload / OCR.
- Recurring transaction auto-generation.
- Multi-currency conversion.
- Budget targets / overspending alerts.
- Bank or SMS integration.
- Real-time presence indicators ("Mom is viewing this page").
---
 
## Patterns to reuse
 
Phase 5 should be high reuse of established conventions:
 
- Pure-function-first for all CSV parsing, name resolution, validation,
  and serialization — tested strictly test-first. The `csv-parser.ts` and
  `template-import.ts` patterns apply directly.
- Float-safety: paisa-based integer arithmetic for every amount parsed or
  serialized.
- Timezone-safe dates via `lib/format/date.ts` — never `new Date(string)`.
- Cache key factories per resource; invalidate at the `byBudget` level.
- Mutations omit `created_by`; DB default fills it. No `.select()` on
  inserts (the RLS workaround).
- Dual-mode forms (`existing` prop) and dual-control dialogs (`trigger` vs
  `open`/`onOpenChange`).
- Skeletons for loading, toasts (once 5.7 lands) for mutation feedback.
---
 
## Test count target
 
Phase 5 adds a meaningful number of pure-logic tests, concentrated in the
CSV work:
 
- CSV transaction row parsing + validation (8-12 tests)
- Name-to-ID resolution and auto-create planning (5-8 tests)
- Dry-run import plan builder (4-6 tests)
- CSV export serialization + round-trip property (5-8 tests)
- Smaller helpers as they emerge (3-5 tests)
Target: ~25-40 new tests. End-of-Phase-5 total: ~220-240.
 
End-to-end Playwright tests (5.9) are separate from this unit-test count.
 
---
 
## Skills to load in the new chat
 
Two skills should be loaded at the start of the Phase 5 chat and used when
relevant:
 
- **`/frontend-design`** — for the Settings page, the import preview UI,
  toast styling, and the mobile polish pass.
- **`shadcn`** — Phase 5 touches several shadcn components (the `sonner`
  toast for 5.7, form components for the Settings page and import UI).
  Load it for component docs and correct usage.
---
 
## Suggested first-message prompt for the new chat
 
Provided as a separate document alongside this plan. It opens with the
decisions above so the new instance can confirm them and begin with 5.1,
the CSV import of real data.
 