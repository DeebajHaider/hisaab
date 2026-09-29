# Phase 5 — Complete
 
Polish, CSV import/export, the carried-over Phase 4 leftovers, and a
substantial number of honest cuts. The phase that lets Hisaab finally
absorb five years of historical budget data, rounds out everyday
navigation gaps, and unifies mutation feedback — while deliberately
trimming work that didn't earn its build cost.
 
---
 
## Scope delivered
 
By the end of Phase 5, Hisaab does the following that it couldn't at the
end of Phase 4:
 
- Imports real historical transactions from a CSV file, with auto-create
  for missing categories and items.
- Exports any month or whole budget to a CSV that re-imports cleanly
  (round-trip property tested).
- Edits transaction dates in the edit dialog (previously delete-and-recreate
  was the only path).
- Navigates between days with the keyboard (left/right arrows).
- Jumps to any day via a calendar popover, and to any month via a month-
  and-year picker — back-filling old data no longer requires N arrow
  clicks.
- Pre-selects the assigned person in the edit-transaction dialog (the
  Phase 4 display bug is fixed for both active and archived assignees).
- Lets a user set their display name via a Settings page, which then
  surfaces everywhere member lists and avatars are rendered.
- Surfaces mutation feedback uniformly: errors always toast as a safety
  net; success toasts appear only where the screen wouldn't otherwise
  show the result.
The spreadsheet can now genuinely be retired for any month whose data has
been imported.
 
---
 
## Substeps and outcomes
 
| Substep | Topic                                                     | Outcome   |
| ------- | --------------------------------------------------------- | --------- |
| 5.1     | CSV import of real transaction data                       | Done      |
| 5.2     | CSV export, round-trippable with the importer             | Done      |
| 5.3     | Date editing, keyboard nav, day picker, month picker      | Done      |
| 5.4     | Realtime updates (Supabase channels)                      | Cut       |
| 5.5     | Person pre-selection in edit-transaction dialog           | Done      |
| 5.6     | Display-name editing (Settings page)                      | Done      |
| 5.7     | Toast notifications via Sonner                            | Done      |
| 5.8     | Inline category/item creation from the entry form         | Cut       |
| 5.9     | Cross-cutting polish (shortcuts, mobile, empty states, E2E) | Cut       |
 
Three substeps were cut outright, a clear majority of what the original
plan listed. Each cut is honestly documented in its own section below —
none are "deferred" with a hidden hope of returning. They were
considered, weighed against actual use patterns, and judged not worth
the build time. If a future need surfaces, the design notes in the
Phase 5 plan document remain valid.
 
---
 
## Architecture additions
 
### New routes
 
```
/app/settings                       → Settings (per-user, outside any budget)
```
 
### New repo tooling (not shipped in the app)
 
```
scripts/convert-budget-csv.mjs      → Legacy wide-pivot budget sheet → narrow CSV
```
 
Quarantined: lives in the repo for reproducibility, never imported by
the app, never bundled. Has no dependencies — pure Node, runs with
`node scripts/convert-budget-csv.mjs <file>`. Detects month and year
from the filename (or `--month YYYY-MM` override), refuses to run if
neither yields a result. Walks the pivot positionally (gap → category
→ items → gap), special-cases the One Time Expenses section into a flat
category, ignores totals rows, surfaces out-of-month cells as loud
warnings rather than silently dropping them. The script was the
single most important piece of infrastructure for getting historical
data in — without it, the in-app importer has nothing to consume.
 
### New pure helpers (all tested)
 
| File                                          | Purpose                                                         | Tests |
| --------------------------------------------- | --------------------------------------------------------------- | ----- |
| `lib/import/transaction-import.ts`            | buildTransactionImportPlan — validation + name resolution       | 28    |
| `lib/import/transaction-export.ts`            | buildTransactionCSV — serializer with round-trip property       | 16    |
 
**Test count delta:** +44 new tests, bringing the suite to roughly 229.
 
### New query and mutation hooks
 
| Hook                          | Resource          | Notes                                        |
| ----------------------------- | ----------------- | -------------------------------------------- |
| `useImportTransactions`       | transactions      | Bulk insert with category/item auto-create   |
| `useExportTransactions`       | transactions      | useCallback returning an async, not a query  |
| `useMyProfile`                | profiles          | Self-read; maybeSingle, RLS-scoped           |
| `useUpdateMyProfile`          | profiles          | Self-update of display_name                  |
 
### New cache key factory
 
| Factory       | Hierarchy                                       |
| ------------- | ----------------------------------------------- |
| `profileKeys` | `['profile']`, `['profile', 'me']`              |
 
### New components
 
#### Date and month navigation
 
- `components/ui/date-picker.tsx` — popover-calendar date picker, shared
  by the day-view header and the edit-transaction form. ISO in / ISO out
  so callers stay timezone-safe.
- `components/transactions/day-header.tsx` — extended with a calendar-icon
  popover trigger using DatePicker, sitting between the next-day arrow
  and the "Today" shortcut.
- `components/transactions/month-header.tsx` — extended with a month-and-
  year picker popover (two compact Selects rather than a calendar; month
  granularity doesn't benefit from a day grid).
#### Import & export
 
- `components/manage/import-dialog.tsx` — third tab "Transactions" added
  to the existing dialog. File picker → dry-run preview (listing new
  categories and items for typo-catching) → confirm. One-shot success
  state that does not auto-reset, guarding against accidental
  double-import.
- `components/manage/export-transactions-button.tsx` — exists from 5.2's
  initial wiring; verified with extended props (from, to, filenameSuffix,
  label) used by the month-view export.
#### Toasts and settings
 
- `components/ui/sonner.tsx` — wraps Sonner's Toaster, theme-aware via
  the existing ThemeProvider. Top-right, 4s/6s, richColors.
- `routes/settings.tsx` — single-section Settings page. Email (read-only),
  Display name (editable, blank = null = email fallback). Inline success
  badge on save (no toast — one feedback channel, not two).
### Modified files of note
 
- `lib/format/date.ts` — unchanged; relied on heavily by new code.
- `lib/import/csv-parser.ts` — unchanged; the new importer and exporter
  reuse it as-is.
- `lib/format/initials.ts` — verified to prefer displayName ?? email
  ordering, no change needed.
- `App.tsx` — added the Settings route at the `/app` layout level and
  mounted the global Toaster.
- `components/layout/app-layout.tsx` — Settings menu item enabled and
  routed.
- `components/transactions/transaction-entry-form.tsx` — gained the
  edit-mode date field (5.3), the Person picker pre-selection fix (5.5,
  via SelectValue children fallback + peopleForPicker list + Select
  remount keyed on personId), and the strict ISO date validator.
- `routes/day-view.tsx` — global keydown listener for left/right arrow
  day navigation, gated on no input focus and no open dialog.
- Eleven mutation hook files (transactions, income, savings, categories,
  items, people, members, invites, budgets, profiles, both importers) —
  gained onError blocks firing toast.error with the supabase error
  message. Inline error rendering preserved everywhere it already
  existed; toasts are additive.
- Eight call sites gained selective toast.success on success: invite
  created / revoked, member role updated / removed / self-left, category
  / item / person archived, CSV export downloaded.
---
 
## Database
 
No schema changes in Phase 5. Every new feature reused the existing
Phase 1-4 schema.
 
The transaction importer touches `transactions`, `categories`, `items`.
The settings page reads and writes `profiles`. The CSV export reads
`transactions` joined to `categories` and `items`. All RLS policies
already in place from Phases 1 and 4 cover the new code paths without
adjustment.
 
---
 
## Decisions worth remembering
 
### 1. The legacy CSV format had to be reshaped externally
The Excel-style budget sheet (one row per item, 4 columns per day, 31
days regardless of month, with the day-headers themselves carrying
incorrect dates) is too specific and too messy to handle inside the
shipped app. The conversion script is a quarantined repo tool that
emits a clean narrow CSV; the in-app importer only ever sees that
narrow CSV. This split keeps the app's import surface generic and
testable while letting the conversion logic be as ugly as the source
data demands.
 
### 2. Month and year resolved from the filename
The day-headers in the legacy sheets lie ("01-June-25" in a February
file). The script reads the month from the filename (`Hisaab_-_February_2026.csv`
→ 2026-02), or accepts `--month YYYY-MM` if the filename can't be
parsed. It refuses to run rather than silently guess.
 
### 3. Auto-create on import, with case-insensitive matching
The transaction importer auto-creates missing categories and items
rather than rejecting their rows. Names match case-insensitively and
whitespace-insensitively against existing taxonomy. The dry-run preview
lists every auto-create explicitly so typos surface before the commit.
 
### 4. The importer is all-or-nothing on validation, not on infrastructure
Validation is strict: any row error blocks the whole file. But the
mutation itself is three separate inserts (categories, items,
transactions); an infrastructure failure mid-import can leave
auto-created taxonomy without its transactions. This is documented as
a known limitation and self-heals on retry (the existing taxonomy
resolves on the second run, transactions insert). True atomicity would
need a Postgres RPC; not built.
 
### 5. ItemToCreate carries a categoryRef, not a categoryName
A small refinement of the pure plan: when an item's parent is an
existing category, the plan stores the category's id directly on the
item. When the parent is also being created, the plan stores the
category name. This means the mutation hook resolves parents without
any extra DB roundtrip — existing parent carries id, new parent
resolves via ids captured during step 1.
 
### 6. Export is a callback, not a query
useExportTransactions is a useCallback returning an async function,
not a useQuery. Export is an imperative button-press action, not
reactive state — refetch-on-mount and refetch-on-focus would both be
wrong for it.
 
### 7. CSV export carries a UTF-8 BOM
The exported file is prefixed with `\uFEFF` so Excel opens UTF-8
correctly. parseCSV strips a leading BOM on re-import, so the
round-trip property is unaffected.
 
### 8. Day-view keyboard nav is gated on Radix roles
The left/right arrow handler checks role="combobox" / "listbox" /
"dialog" via closest() — covering the search combobox, every Select,
every open dialog, and the calendar popover with one check. Modifier
keys (alt/ctrl/meta/shift) pass through so browser shortcuts and text
selection still work.
 
### 9. Month picker is two Selects, not a calendar
The shadcn Calendar in dropdown-caption mode doesn't navigate to
months — it only changes the display month of the day grid. And the
grid has its own start-of-week ambiguity. A month picker should be
two compact Selects (month, year) in a popover, and that's what it is.
 
### 10. Edit-mode date sits at the top of the form
The Date field renders in edit mode only, at the top of the entry
form. Changing a date is often the primary reason a user opens the
edit dialog (a transaction was logged on the wrong day), so it gets
top billing rather than living next to the notes at the bottom.
 
### 11. Person picker uses a remount key
Radix Select matches `value` against its `SelectItem` children at
mount time. When the form pre-fills `personId` in an effect after the
Select has already mounted with `value=""`, the trigger can stay
blank even after state updates correctly. Adding `key={`person-${personId
?? "none"}`}` forces one clean remount as the pre-fill completes — the
display lookup then runs with the right value already in place. The
cost is one re-render, the benefit is the picker always shows the
assignee.
 
### 12. Archived people show only as the current assignee
A `peopleForPicker` list is derived as: all active people, plus the
existing assignee if they're archived (marked "archived" in both the
trigger and the dropdown row). Archived people are NOT freely pickable
options — they appear only as the current assignee. This preserves
archive hygiene (archiving means "don't pick this anymore") while
restoring data fidelity (the existing assignment is shown).
 
### 13. Display name optional; blank = email fallback
A blank display_name saves as null and the UI falls back to email
everywhere. There's no required name. Reasoning: emails are already
unique, displayName is a personalization not an identity, and the
member list pre-displayName already worked with email-only.
 
### 14. Settings page is single-purpose
The page contains exactly one section: profile. Considered adding
theme, currency, and notifications. Theme already in the header,
currency lives on the budget, notifications don't exist. Single-field
page is honest about scope — better than padding with placeholders.
 
### 15. Toasts as a safety net, not a megaphone
Errors always toast — fired from inside the mutation hooks' onError
blocks, so silent failures become structurally impossible. Success
toasts are selective, fired from call sites, only where the screen
wouldn't otherwise show the result (dialog closes, navigation away,
download starts in the background). Routine entry-form writes stay
silent because the form clearing and the list updating already convey
success. Inline error rendering is preserved everywhere it existed —
toasts are additive, not a replacement, because some errors deserve
persistent visibility (the import dry-run validation list).
 
### 16. No double-feedback rule
Settings save shows an inline badge; the toast is suppressed there.
Import success has its own panel; the toast is suppressed there. Two
feedback channels for the same event is worse than one — pick the one
that fits the surface.
 
---
 
## Honest cuts
 
The original Phase 5 plan listed nine substeps. Three were cut. Each
cut was deliberate, not forgotten or deferred — meaning the use case
genuinely didn't justify the build cost at the time. If a need
surfaces later, the design notes in `hisaab-phase-5-plan.md` remain
valid starting points.
 
### 5.4 — Realtime updates (CUT)
 
The Phase 5 plan inherited 5.4 from Phase 4's deferral, sketched a
useBudgetRealtime hook subscribing to Supabase channel events on every
per-budget resource, and noted the prerequisite dashboard step to
enable replication per table.
 
**Why cut.** Budgeting is not a real-time activity in this user's
workflow. The pattern is "sit down on Sunday afternoon, enter the
week." The collaborative case (a second member entering at the same
moment) is rare. The existing `refetchOnWindowFocus: true` (enabled
in Phase 4 as a stopgap) already covers the tab-switch case.
Implementing real channel subscriptions would add a class of
integration bugs to chase and meaningful surface area to maintain,
for a feature whose value at family scale is marginal.
 
The honesty note in the sidebar ("Updates aren't live") stays — it's
accurate, and removing it without building the feature would be a lie.
 
The design sketch in `hisaab-phase-4-plan.md` section 4.5 and the
decision record in `Phase_4_complete.md` decision #11 remain
authoritative if the use pattern ever changes.
 
### 5.8 — Inline category/item creation (CUT)
 
Originally a deferred Phase 2 item: when logging a transaction and the
needed category or item doesn't exist, let the user create it inline
from the search combobox without navigating to Manage.
 
**Why cut.** Phase 5.1's auto-create flow accidentally removed most of
this need — five years of historical taxonomy is now in the database,
and new items trickle in maybe a handful per month. For that frequency,
the existing "Manage → create → Day" round-trip is mildly annoying but
not painful. The build cost is high (two nested inline forms, careful
state management around mid-entry cancel, recursive new-category-from-
new-item flow, interplay with the combobox's keyboard navigation),
estimated at two sessions — disproportionate to the value at current
logging frequency.
 
Workaround if the need ever spikes: a small new-items CSV can be
imported via the existing Phase 2 template importer, since unknown
names auto-create.
 
### 5.9 — Cross-cutting polish (CUT)
 
Listed five items: keyboard shortcuts (e.g. `n` to focus search),
mobile polish, empty-state polish, end-to-end Playwright tests, and
the optional `budget_members.created_at` column.
 
**Why cut.**
 
- **Keyboard shortcut `n`** — small build, real but minor value, no
  active need. Easy to add later if the logging workflow becomes
  batch-heavy. Considered but not built.
- **Mobile polish** — vague catch-all without a specific pain point.
  The user's workflow is laptop-based; mobile polish without a
  concrete grievance is speculation.
- **Empty-state polish** — every empty state in the app is currently
  serviceable. No specific one was flagged as poor.
- **Playwright E2E** — meaningful infrastructure work (test database
  or seed state, auth fixtures, deterministic resets) for a project
  whose forward roadmap is uncertain. Worth building IF and WHEN
  Phase 6 (portfolio module) gets started — deferred to that prep,
  not to a polish phase.
- **`budget_members.created_at`** — solves a non-problem. No join-
  date display is wanted.
---
 
## Known limitations carried forward
 
These are documented quirks of what shipped, not bugs:
 
1. **Transaction import is not transactional.** Three separate
   inserts (categories, items, transactions). An infrastructure
   failure mid-import can leave auto-created taxonomy without its
   transactions. Self-heals on retry. True atomicity needs a Postgres
   RPC; not built. See decision #4 above.
2. **CSV export does not include income or savings.** Symmetric with
   import — income/savings import was dropped from 5.1, so export
   doesn't surface them either. Easy to add if needed.
3. **The conversion script can't recover money in out-of-month day
   cells.** Loud warning, not silent loss — the user sees a warning
   per cell and decides where the money belongs. Designed-as-intended.
4. **Member-list display names refresh requires a tab refocus or
   manual reload.** Updating display name invalidates the relevant
   caches, but a member list rendered in another tab won't update
   until that tab gets focus. This is the realtime-deferred behaviour;
   it propagates within a single tab fine.
5. **The `n`-to-focus-search shortcut doesn't exist.** Power-user
   convenience deliberately not built. The arrow-key day navigation
   from 5.3 covers the more frequent need.
---
 
## File index
 
### New files added in Phase 5
 
```
scripts/
└── convert-budget-csv.mjs                       (5.1, quarantined repo tool)
 
src/
├── components/
│   ├── manage/
│   │   └── export-transactions-button.tsx       (5.2)
│   └── ui/
│       ├── calendar.tsx                         (5.3, via shadcn add)
│       ├── date-picker.tsx                      (5.3)
│       └── sonner.tsx                           (5.7, replaced shadcn default)
├── lib/
│   └── import/
│       ├── download-csv.ts                      (5.2)
│       ├── transaction-export.ts                (5.2) + test
│       └── transaction-import.ts                (5.1) + test
├── queries/
│   ├── profile-keys.ts                          (5.6)
│   ├── use-export-transactions.ts               (5.2)
│   ├── use-import-transactions.ts               (5.1)
│   ├── use-my-profile.ts                        (5.6)
│   └── use-update-my-profile.ts                 (5.6)
└── routes/
    └── settings.tsx                             (5.6)
```
 
### Modified files
 
- `src/App.tsx` — Settings route, Toaster mount
- `src/components/layout/app-layout.tsx` — Settings menu item enabled
- `src/components/manage/import-dialog.tsx` — Transactions tab added (5.1)
- `src/components/transactions/day-header.tsx` — calendar popover (5.3)
- `src/components/transactions/month-header.tsx` — month-and-year picker (5.3), Export button (5.2)
- `src/components/transactions/transaction-entry-form.tsx` — date field (5.3), Person picker fix (5.5)
- `src/lib/query-client.ts` — (no change in Phase 5, but the Phase 4 refetchOnWindowFocus stayed in effect throughout)
- `src/routes/day-view.tsx` — keyboard nav effect (5.3)
- Eleven mutation hook files — onError toast.error blocks
- Eight call sites — selective toast.success on success
### New dependencies
 
- `react-day-picker` — pulled in by `npx shadcn@latest add calendar` (5.3)
- `date-fns` — pulled in by react-day-picker
- `sonner` — pulled in by `npx shadcn@latest add sonner` (5.7)
---
 
## Commits
 
Phase 5 was delivered across the following conventional commits:
 
```
feat: import real transactions from CSV
feat: export transactions to CSV with round-trip property
feat: date editing, keyboard nav, and date/month pickers
fix: pre-select the assigned person in edit-transaction dialog
feat: add settings page with display-name editing
feat: add toast notifications via sonner
```
 
Six commits, six shipped substeps. The cut substeps (5.4, 5.8, 5.9)
generated no commits, by construction.
 
---
 
## Phase 6 readiness
 
Phase 5 closes with the app in a state where every realistic
single-user workflow is supported end-to-end. The remaining roadmap
items from `hisaab-master-plan.md`:
 
- **Phase 6 — Portfolio module.** A separate, additive build. Reuses
  auth, layout, theme. Per-user, not per-budget (the master plan is
  explicit on this). Tables and pages sketched in the master plan.
  Phase 6's first step, if undertaken, should bring along the
  Playwright E2E infrastructure that was cut from 5.9 — at that
  point, the test surface justifies the setup cost.
- **Phase 7+ — Long tail.** Receipt OCR, recurring transactions,
  multi-currency, budget targets, bank integration, push, offline.
  Each is a phase of its own.
The cuts from Phase 5 are honest deferrals to need-driven future
work, not technical debt. Realtime, inline taxonomy creation, and
polish items will surface again only if the use pattern changes.
Until then, they correctly do not exist.
 
Hisaab is now a finished single-user budgeting app with shared-budget
support, real historical data import, and a clean polish pass on the
parts that matter. The spreadsheet is retireable.
