# Hisaab — Architecture Summary

Reference doc for what's built and how it's organized. Pair with
`hisaab-master-plan.md` for the roadmap.

---

## Stack snapshot

- **React 18 + Vite + TypeScript** for the SPA
- **Tailwind 4** with `@tailwindcss/vite` plugin
- **shadcn/ui** components (Radix variant, Nova preset, Neutral palette, Lucide icons)
  copied into `src/components/ui/`. Source is owned in-repo, not a node_module.
- **TanStack Query v5** for data fetching, caching, mutations
- **React Router 6** with nested routes and `<Outlet />` layouts
- **Supabase** for Postgres, Auth, RLS. Anon-key direct access from the browser;
  RLS enforces multi-user isolation.
- **Vitest + React Testing Library + jsdom** for tests
- Deployed to **Vercel** (planned, not yet pushed) with Supabase URL + anon key
  as env vars

Path alias: `@/` resolves to `src/`. Configured in both `tsconfig.app.json`
(for editor IntelliSense) and `vite.config.ts` (for the bundler).

---

## Folder structure

```
hisaab/
├── README.md                          High-level intro, stack notes, dev commands
├── components.json                    shadcn config (style, paths, baseColor)
├── eslint.config.js                   Linting rules
├── index.html                         Vite entry HTML
├── package.json                       Dependencies and npm scripts
├── tsconfig.json                      Root TS config (referenced)
├── tsconfig.app.json                  App TS config (paths + types)
├── tsconfig.node.json                 TS config for node tooling
├── vite.config.ts                     Vite + Vitest config (combined)
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── App.tsx                        Top-level providers + route table
│   ├── main.tsx                       React entry point
│   ├── index.css                      Tailwind directives + shadcn CSS variables
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── require-auth.tsx       Route guard, redirects to /auth if not signed in
│   │   ├── budgets/
│   │   │   └── create-budget-dialog.tsx
│   │   ├── charts/                    (empty — populated in Phase 3)
│   │   ├── layout/
│   │   │   ├── app-layout.tsx         Outer shell: header, theme toggle, user menu
│   │   │   └── budget-layout.tsx      Inner shell: sidebar nav for budget pages
│   │   ├── manage/
│   │   │   ├── archive-confirm-dialog.tsx
│   │   │   ├── category-form-dialog.tsx    Dual-mode (create/edit via `existing` prop)
│   │   │   ├── category-tree.tsx           Collapsible category list with item rows
│   │   │   ├── import-dialog.tsx           CSV + template import, two-tab UI
│   │   │   └── item-form-dialog.tsx        Dual-mode + supports controlled `open` prop
│   │   ├── transactions/
│   │   │   ├── day-header.tsx              Date nav + day total
│   │   │   ├── delete-transaction-dialog.tsx
│   │   │   ├── edit-transaction-dialog.tsx
│   │   │   ├── transaction-entry-form.tsx  Dual-mode form with custom search combobox
│   │   │   └── transaction-list.tsx        Grouped by category with subtotals
│   │   └── ui/                              shadcn primitives (owned in-repo)
│   │       ├── alert-dialog.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── collapsible.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── input-group.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── select.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── textarea.tsx
│   │
│   ├── data/                          (empty — reserved for static data; template
│   │                                   currently lives inline in template-import.ts)
│   │
│   ├── lib/
│   │   ├── auth-context.tsx           AuthProvider + useAuth hook
│   │   ├── calculations/              Pure logic, fully tested
│   │   │   ├── day-totals.ts          calculateDayTotal + groupTransactionsByCategory
│   │   │   ├── day-totals.test.ts
│   │   │   ├── percent-contribution.ts
│   │   │   └── percent-contribution.test.ts
│   │   ├── format/
│   │   │   ├── date.ts                todayISO, toISODate, addDays, formatDayLabel
│   │   │   ├── date.test.ts
│   │   │   ├── initials.ts            getInitials({ displayName, email })
│   │   │   ├── initials.test.ts
│   │   │   ├── tree-sort.ts           groupItemsByCategory
│   │   │   └── tree-sort.test.ts
│   │   ├── import/
│   │   │   ├── csv-parser.ts          Hand-rolled state-machine CSV tokenizer
│   │   │   ├── csv-parser.test.ts
│   │   │   ├── template-import.ts     buildImportPlan + TEMPLATE_CSV_SAMPLE
│   │   │   └── template-import.test.ts
│   │   ├── query-client.ts            Singleton QueryClient with staleTime: 30s, retry: 1
│   │   ├── search/
│   │   │   ├── rank-items.ts          Ranking algorithm with recency + frequency boosts
│   │   │   └── rank-items.test.ts
│   │   ├── supabase.ts                Singleton Supabase client (typed via Database)
│   │   ├── theme-provider.tsx         ThemeProvider + useTheme (light/dark/system)
│   │   └── utils.ts                   shadcn `cn()` helper
│   │
│   ├── queries/                       TanStack Query hooks, one resource per file
│   │   ├── transaction-keys.ts        Cache key factory (tested)
│   │   ├── transaction-keys.test.ts
│   │   ├── use-budget.ts              Single budget by id
│   │   ├── use-budgets.ts             List of budgets the user is a member of
│   │   ├── use-categories.ts          Categories in a budget
│   │   ├── use-category-mutations.ts  Create/update/archive (cascade-archives items)
│   │   ├── use-create-budget.ts       Separate file due to early established pattern
│   │   ├── use-import-template.ts     Bulk-insert with merge semantics
│   │   ├── use-item-mutations.ts      Create/update/archive
│   │   ├── use-items.ts               Items joined with categories
│   │   ├── use-people.ts              Family members for tracked categories
│   │   ├── use-recent-items.ts        Aggregated item usage from last 30 days
│   │   ├── use-transaction-mutations.ts  Create/update/delete (no .select())
│   │   └── use-transactions.ts        One day's transactions with item/category/person joined
│   │
│   ├── routes/                        Page components, one per file
│   │   ├── auth.tsx                   Sign in / sign up
│   │   ├── budget-redirect.tsx        Smart redirect at /app/budgets/:id
│   │   ├── budgets-home.tsx           List of user's budgets, create dialog
│   │   ├── day-view.tsx               Date header + entry form + transaction list
│   │   ├── landing.tsx                Public marketing page
│   │   ├── manage.tsx                 Categories & items management
│   │   └── not-found.tsx              404 fallback
│   │
│   ├── test/
│   │   └── setup.ts                   Vitest setup: imports jest-dom matchers
│   │
│   └── types/
│       └── db.ts                      Generated by `supabase gen types typescript`
│                                       — do not edit by hand
│
└── supabase/
    ├── config.toml                    CLI config
    └── migrations/                    Versioned SQL, source of truth for schema
        ├── 20260504112142_init_schema.sql
        ├── 20260504142951_add_rls_policies.sql
        └── 20260504201719_use_auth_uid_defaults.sql
```

---

## Routing

```
/                                      Landing (public)
/auth                                  Sign in / up (public)
/app                                   AppLayout (RequireAuth wrapped)
  /                                    BudgetsHome (index)
  /budgets/:budgetId                   BudgetLayout (sidebar)
    /                                  BudgetRedirect (decides where to send)
    /day/:date                         DayView
    /manage                            Manage
*                                      NotFound
```

Two layouts compose. `AppLayout` (header) wraps everything protected.
`BudgetLayout` (sidebar) wraps everything inside a budget. Each has its own
`<Outlet />`.

`BudgetRedirect`: if budget has no categories → `/manage` (onboarding); else
→ `/day/<today>` (work).

---

## Database schema

8 tables in the `public` schema, all with RLS enabled.

| Table              | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `budgets`          | Workspaces (Personal, Family). `is_shared` flag.                 |
| `budget_members`   | Join table. Roles: `owner`, `editor`, `viewer`.                  |
| `categories`       | Top-level spending buckets. `tracks_person` flag for per-person. |
| `items`            | Specific things logged. `unit`, `default_rate`, `default_mode`.  |
| `people`           | Family members for tracked categories.                           |
| `transactions`     | Log entries. `amount` always required; `rate`/`qty` optional.    |
| `income_entries`   | Monthly income (Phase 3 will use these).                         |
| `savings_entries`  | Explicit savings allocations (Phase 3).                          |

Standard fields on most tables: `id uuid PK`, `created_by uuid → auth.users(id)`,
`created_at timestamptz`. Soft-delete via `is_archived boolean` on categories,
items, people. Transactions hard-delete.

Triggers:

- `on_budget_created` — when a budget is inserted, auto-add the creator as `owner`
  in `budget_members`. Uses `security definer` to bypass RLS during the insert.

Defaults:

- `budgets.created_by`, `transactions.created_by`, `income_entries.created_by`,
  `savings_entries.created_by` all default to `auth.uid()`. Mutations omit
  this field; the database fills it in from the JWT.

---

## RLS policies

Helper functions (all owned by `postgres`, with `security definer` and
`stable` for performance):

- `is_budget_member(b_id uuid) → boolean` — true if `auth.uid()` has a row in
  `budget_members` for budget `b_id`.
- `has_budget_role(b_id uuid, min_role text) → boolean` — like `is_budget_member`
  but checks role hierarchy (viewer < editor < owner).
- `is_item_budget_member(item_category_id uuid)` — for items, walks through
  `categories` to reach `budget_members`.
- `has_item_budget_role(item_category_id uuid, min_role text)` — same.

Policy patterns:

- **Read**: members of the budget can read everything in it.
- **Insert**: editors+ can insert. New rows must satisfy `created_by = auth.uid()`
  where applicable.
- **Update**: editors+ can update taxonomy (categories, items, people).
  For transactions, income, and savings, **any editor can edit any row**
  (family-trust model — anyone can fix anyone else's mistakes).
- **Delete**: editors+ can delete transactions. Owners only can delete budgets.
  Members can remove themselves from a budget.

Why the function ownership matters: if these functions weren't owned by
`postgres`, `security definer` would fall back to whoever owns them (which
might be a non-superuser role subject to RLS). The owner check matters for
the chicken-and-egg case during `INSERT ... RETURNING *` — the SELECT policy
calling these functions needs to bypass RLS to read `budget_members` while
the trigger is still inserting.

---

## Conventions

**Naming:**

- Named exports throughout, never default exports.
- Files: `kebab-case.ts` and `kebab-case.tsx`. Components inside use `PascalCase`.
- Tests colocated as `foo.test.ts` next to `foo.ts`.

**Hooks:**

- Hooks file per resource: `use-{resource}.ts` for queries, `use-{resource}-mutations.ts`
  for write operations. Earlier files (`use-create-budget.ts`) follow an older
  pattern; new code prefers the consolidated mutations file.
- Cache key factories per resource (`transactionKeys.byDay(...)`) instead of
  inline arrays.
- Mutations invalidate at the `byBudget` level rather than the day level —
  simpler and always correct.

**Forms:**

- Dual-mode pattern: optional `existing` prop puts the form in edit mode.
  Submit branches between `createMutation.mutateAsync` and `updateMutation.mutateAsync`.
- Heading text and button labels read from the mode.
- The `onSaved` and `onCancel` callbacks let a parent (usually a dialog) close
  itself.

**Dialogs:**

- Two-mode pattern: either `trigger` prop (uncontrolled, dialog manages own open
  state) or `open` + `onOpenChange` props (controlled by parent). `ItemFormDialog`
  shows this pattern.
- AlertDialog for destructive actions, regular Dialog for everything else.
- Confirmation dialogs accept an `onConfirm` callback rather than knowing
  about mutations themselves.

**Mutations:**

- Don't use `.select()` to return inserted rows. RLS evaluation order during
  `INSERT ... RETURNING` triggers a SELECT policy that re-evaluates membership
  in the same statement the trigger just wrote, which fails. Workaround: don't
  return the row, invalidate the list, refetch. The newly-inserted row appears
  on the next render after refetch completes.
- camelCase props translated explicitly to snake_case columns. Avoid spreading
  patches because typos go undetected.
- `created_by` never set client-side. The DB default (`auth.uid()`) handles it.

**Testing strategy:**

- Strict TDD on pure logic (calculations, parsers, formatters, ranking).
- Test-after on query hooks (with mocked supabase client when added).
- No tests on UI components, page wiring, dialogs, layouts — verified manually,
  end-to-end coverage planned for a later phase.
- Vitest with `globals: true` (no per-file imports of `describe`, `it`, `expect`).

**Styling:**

- Tailwind classes inline, no CSS modules.
- Use shadcn semantic tokens (`bg-background`, `text-foreground`, `border-border`,
  `text-destructive`) so dark mode works automatically.
- Teal palette for accent colors (`text-teal-600 dark:text-teal-400`,
  `bg-teal-600 hover:bg-teal-700 text-white`).
- `tabular-nums` for any column of numbers that update.
- `localeCompare` for sorts that need Unicode correctness.

---

## Important known quirks

1. **Mutations don't return inserted rows.** See above. Workaround documented
   per-file.

2. **`security definer` ownership.** Helper functions for RLS must be owned by
   `postgres`. If anyone runs `alter function ... owner to <other>`, things
   break silently.

3. **Date handling.** Don't use `toISOString().slice(0, 10)` — it's UTC and
   gives wrong results in eastern timezones late at night. Use `todayISO()`.

4. **Floating-point money.** Don't sum amounts directly. Convert to cents,
   sum integers, divide back. `calculateDayTotal` shows the pattern.

5. **Supabase types are regenerated.** `src/types/db.ts` is rebuilt by
   `npm run types:supabase` after schema changes. Don't edit by hand.

6. **Cache invalidation hierarchy matters.** `["transactions", budgetId]`
   invalidates all day/month sub-keys. Putting `'day'` before the budgetId
   in a key would break this — the order is intentional.

7. **`maybeSingle` vs `single`.** `single()` throws if not exactly one row.
   `maybeSingle()` returns null. Use `maybeSingle` for "fetch by ID where the
   ID might be wrong" scenarios — UI shows a not-found state instead of erroring.

---

## Test count

86 tests across 9 files as of end of Phase 2:

- `percent-contribution.test.ts` — 6
- `initials.test.ts` — 7
- `date.test.ts` — 14
- `tree-sort.test.ts` — 6
- `csv-parser.test.ts` — 18
- `template-import.test.ts` — 17
- `rank-items.test.ts` — 16
- `day-totals.test.ts` — 8
- `transaction-keys.test.ts` — 7
- (some counts may be ±1 depending on subtest splits)

Run all: `npm test` (watch) or `npm run test:run` (single run).
