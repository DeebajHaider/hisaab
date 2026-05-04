-- ============================================================================
-- Migration: init_schema
-- Creates the core tables for Hisaab.
-- RLS policies live in a separate migration so they can evolve independently.
-- ============================================================================

-- Enable UUID generation. gen_random_uuid() is built into Postgres 13+ via pgcrypto.
-- Supabase enables this by default but being explicit is harmless.
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- budgets: a workspace for tracking expenses (e.g., "Personal", "Family")
-- ----------------------------------------------------------------------------
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 100),
  currency    text not null default 'PKR' check (length(currency) = 3),
  is_shared   boolean not null default false,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Index: when listing a user's budgets, we filter by membership (in budget_members),
-- but having created_by indexed helps for "budgets I own" queries later.
create index budgets_created_by_idx on public.budgets(created_by);

-- ----------------------------------------------------------------------------
-- budget_members: who has access to a given budget, and at what role
-- ----------------------------------------------------------------------------
create table public.budget_members (
  budget_id   uuid not null references public.budgets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner', 'editor', 'viewer')),
  joined_at   timestamptz not null default now(),
  primary key (budget_id, user_id)
);

-- Index: "what budgets does this user belong to?" is THE most common query.
-- Postgres can use the primary key (budget_id, user_id) for budget-side lookups,
-- but for user-side lookups we need a separate index.
create index budget_members_user_idx on public.budget_members(user_id);

-- ----------------------------------------------------------------------------
-- categories: top-level spending buckets within a budget
-- e.g., "Monthly Grocery", "Vehicle", "School"
-- ----------------------------------------------------------------------------
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  name            text not null check (length(name) between 1 and 100),
  sort_order      int not null default 0,
  color           text,
  tracks_person   boolean not null default false,  -- true for Pocket Money, School Fees, etc.
  is_archived     boolean not null default false
);

create index categories_budget_idx on public.categories(budget_id, sort_order);

-- ----------------------------------------------------------------------------
-- items: specific things bought within a category
-- e.g., "Flour" (Kg) under "Monthly Grocery"
-- ----------------------------------------------------------------------------
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references public.categories(id) on delete cascade,
  name            text not null check (length(name) between 1 and 100),
  unit            text,                         -- 'Kg', 'Ltr', 'Each', etc.; null = no unit
  default_rate    numeric(12, 2),               -- pre-fill rate if mostly the same price
  default_mode    text not null default 'lump'
                  check (default_mode in ('lump', 'rate_qty')),
  sort_order      int not null default 0,
  is_archived     boolean not null default false
);

create index items_category_idx on public.items(category_id, sort_order);

-- ----------------------------------------------------------------------------
-- people: family members tracked per budget
-- Optional — used only when a category has tracks_person = true
-- ----------------------------------------------------------------------------
create table public.people (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  name            text not null check (length(name) between 1 and 100),
  is_archived     boolean not null default false
);

create index people_budget_idx on public.people(budget_id);

-- ----------------------------------------------------------------------------
-- transactions: the actual log entries — the heart of the app
-- ----------------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  category_id     uuid not null references public.categories(id) on delete restrict,
  item_id         uuid not null references public.items(id) on delete restrict,
  person_id       uuid references public.people(id) on delete set null,
  date            date not null,
  -- Rate and qty are optional (lump-sum transactions don't have them).
  -- Amount is always required and is the source of truth for totals.
  rate            numeric(12, 2),
  qty             numeric(12, 3),
  amount          numeric(12, 2) not null check (amount >= 0),
  notes           text,
  created_by      uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- Index: day view fetches "all transactions for budget X on date Y"
create index transactions_budget_date_idx on public.transactions(budget_id, date desc);
-- Index: month view + category roll-ups
create index transactions_budget_category_date_idx on public.transactions(budget_id, category_id, date);

-- ----------------------------------------------------------------------------
-- income_entries: monthly income for variance calculations
-- ----------------------------------------------------------------------------
create table public.income_entries (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  source          text not null check (length(source) between 1 and 100),
  amount          numeric(12, 2) not null check (amount >= 0),
  date            date not null,
  notes           text,
  created_by      uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index income_entries_budget_date_idx on public.income_entries(budget_id, date desc);

-- ----------------------------------------------------------------------------
-- savings_entries: explicit savings allocations (separate from leftover variance)
-- ----------------------------------------------------------------------------
create table public.savings_entries (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  name            text not null check (length(name) between 1 and 100),
  amount          numeric(12, 2) not null check (amount >= 0),
  date            date not null,
  notes           text,
  created_by      uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index savings_entries_budget_date_idx on public.savings_entries(budget_id, date desc);

-- ----------------------------------------------------------------------------
-- Trigger: when a budget is created, auto-add the creator as 'owner'.
-- This keeps the membership model consistent: every budget has at least one member.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_budget()
returns trigger
language plpgsql
security definer  -- runs with the function owner's privileges, bypassing RLS
set search_path = public
as $$
begin
  insert into public.budget_members (budget_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_budget_created
  after insert on public.budgets
  for each row execute function public.handle_new_budget();