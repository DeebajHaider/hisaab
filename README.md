# Hisaab

A personal and family budgeting app, with portfolio tracking built in. Replaces the spreadsheet most families use to track expenses, with a real schema, real sharing, and proper history.

> *Hisaab* (حساب) — Urdu/Arabic for "account" or "calculation."

---

## What it does

**Budgeting side**

- Log expenses against categories and items, day by day, with rate × quantity or lump-sum entry modes
- Track per-person spending for categories where it matters (school fees, pocket money, doctor visits)
- Record monthly income and savings, with variance calculated automatically
- See spending broken down by category for any month, with a category deselector to surface what would otherwise be drowned out
- Visualise multi-year trends — monthly totals, category comparisons, category composition over time — with sensible timeframes from 1 month to "all"
- Share a budget with family members across separate accounts, with editor and viewer roles
- Soft-delete (archive) categories and items so transaction history stays intact; permanently delete with explicit confirmation when truly done with them

**Portfolio side**

- Track what you own — stocks, ETFs, mutual funds, money-market instruments, gold, property, retirement funds, foreign holdings, etc. — grouped by asset class
- Two numbers per holding: original investment and current value. Profit calculated in rupees and percent
- Update a holding's current value as of any date; the value history accrues over time for the progression chart
- See portfolio totals per currency, with an optional manual FX blend into a unified PKR figure
- View allocation by asset class, and a per-holding line chart of value over time
- Portfolios are private — never shared even when budgets are

**Across both**

- Light, dark, and system theme
- Mobile-friendly (sidebar collapses to a drawer at narrow widths)
- Multi-currency support with PKR as the default
- Email/password auth via Supabase
- Real-time updates inside shared budgets

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix variant, Nova preset, Neutral palette, Lucide icons) |
| State / data | TanStack Query v5 |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions) |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Hosting | Vercel (frontend), Supabase Cloud (backend) |

No Express layer — the React app talks to Supabase directly. Multi-user permissions are enforced by Row Level Security policies in Postgres, not application code.

---

## Getting started locally

### Prerequisites

- Node.js 20 or later
- npm (comes with Node)
- A Supabase account (free tier works fine)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) for running migrations: `npm install -g supabase`

### Setup

**1. Clone and install:**

```bash
git clone <your-repo-url> hisaab
cd hisaab
npm install
```

**2. Create a Supabase project:**

- Sign in at [supabase.com](https://supabase.com) and create a new project
- Note the project URL and the `anon` public API key from Settings → API
- The free tier is enough for personal use

**3. Configure environment variables:**

Create a `.env.local` file at the project root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

**4. Link the CLI and apply migrations:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies every migration in `supabase/migrations/` in order — schema, RLS policies, RPCs, triggers, the asset-class seed, the account-deletion sequence, everything.

**5. Generate TypeScript types from the schema:**

```bash
npx supabase gen types typescript --linked > src/types/db.ts
```

Run this any time you add a migration.

**6. Run the dev server:**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign up with an email and password, create your first budget, and you're going.

### Optional: enable email features

The forgot-password and email-invite flows require an email provider configured in Supabase. Without one, password resets won't work and budget invites will be created but not emailed.

To enable, configure SMTP (or use a provider like Resend) in your Supabase project's Authentication → Email settings, then whitelist `/reset-password` and the app's domain in the redirect URLs.

### Optional: deploy

Vercel deploys this app cleanly with zero config:

1. Push the repo to GitHub
2. Import it in Vercel
3. Add the two environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings
4. Deploy

The build command is `npm run build`. The output directory is `dist`.

---

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build (`tsc -b && vite build`) — surfaces type errors invisible in dev |
| `npm run preview` | Preview the production build locally |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest one-shot run |
| `npm run lint` | ESLint over the project |

---

## Project structure

```
hisaab/
├── public/                      Static assets
├── src/
│   ├── App.tsx                  Top-level providers + route table
│   ├── main.tsx                 React entry point
│   ├── index.css                Tailwind directives + shadcn CSS variables
│   │
│   ├── components/
│   │   ├── auth/                RequireAuth route guard
│   │   ├── budgets/             Create budget dialog
│   │   ├── charts/              Recharts wrappers
│   │   ├── error-boundary.tsx   App-wide render error fallback
│   │   ├── layout/              AppLayout, BudgetLayout, PortfolioLayout
│   │   ├── manage/              Category/item CRUD dialogs, import dialog
│   │   ├── portfolio/           Portfolio dialogs, charts, lists
│   │   ├── transactions/        Day header, transaction list, entry form
│   │   └── ui/                  shadcn primitives (owned in-repo)
│   │
│   ├── lib/
│   │   ├── auth-context.tsx     AuthProvider + useAuth hook
│   │   ├── calculations/        Pure logic, fully tested (totals, profits, summaries)
│   │   ├── format/              Date, money, initials, tree-sort, history-collapse
│   │   ├── import/              CSV parser + template import
│   │   ├── search/              Item ranking algorithm
│   │   ├── supabase.ts          Singleton Supabase client
│   │   └── theme-provider.tsx   Light/dark/system theme
│   │
│   ├── queries/                 TanStack Query hooks, one resource per file
│   │   ├── transaction-keys.ts  Cache key factories
│   │   └── use-*.ts             Query and mutation hooks
│   │
│   ├── routes/                  Page components
│   │   ├── auth.tsx             Sign in / sign up / reset password
│   │   ├── budget-*.tsx         Budget pages (day, month, manage, members, settings, trends)
│   │   ├── portfolio-*.tsx      Portfolio pages (home, overview, holdings, manage)
│   │   ├── settings.tsx         User account settings
│   │   └── not-found.tsx        404
│   │
│   └── types/db.ts              Generated by Supabase; do not edit
│
└── supabase/
    ├── config.toml              CLI config
    └── migrations/              Versioned SQL; source of truth for schema
```

---

## How the data model fits together

Three resource scopes:

- **User-private** — `portfolios`, `asset_classes`, `holdings`, `holding_value_history`. Never shared. RLS keys on `created_by = auth.uid()` or membership via `owns_portfolio`.
- **Budget-scoped, shareable** — `budgets`, `budget_members`, `categories`, `items`, `transactions`, `income_entries`, `savings_entries`, `people`, `budget_invites`. Multi-user. RLS keys on `is_budget_member(budget_id)`.
- **Auth-managed** — `auth.users`, sessions, refresh tokens. Owned by Supabase Auth.

Soft-delete (`is_archived`) is used for taxonomy that has transaction history attached (categories, items, holdings, asset classes). Hard delete with cascade is available behind explicit confirmation. Transactions themselves are hard-deleted because correcting a typo shouldn't leave a phantom row.

---

## Conventions worth knowing

If you fork or contribute:

- **Named exports throughout.** No default exports.
- **`kebab-case.ts` filenames, `PascalCase` for components inside.**
- **Path alias `@/`** points to `src/`. Configured in both `tsconfig.app.json` and `vite.config.ts`.
- **camelCase in TypeScript, snake_case in the database.** Mutations translate explicitly at the boundary.
- **Mutations never use `.select()` to return inserted rows** — RLS evaluation timing during `INSERT ... RETURNING` triggers a SELECT policy on the new row, which fails. Workaround everywhere: invalidate the list, refetch.
- **`created_by` is never set client-side.** Database defaults to `auth.uid()`.
- **Conventional Commits.** `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- **Cents-based money math.** Multiply by 100, sum integers, divide back. Floating-point accumulates errors otherwise.
- **TDD on pure logic, test-after on query hooks, no tests on UI wiring.** End-to-end tests deferred.

---

## What's deliberately not in this app

- Automated price fetching for portfolio holdings — values are entered manually
- Receipt OCR or photo capture
- Recurring transactions / autopay tracking
- Multi-currency conversion with live FX — manual blend rate only
- Push or email notifications
- Bank or broker statement imports beyond the CSV taxonomy importer
- Tax-aware reporting (FIFO, LIFO, capital gains by tax year)
- Budget targets or overspending alerts
- Offline mode


---

