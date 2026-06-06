-- Phase 6.1 — Portfolio module foundation
--
-- Four user-private tables (portfolios, asset_classes, holdings,
-- holding_value_history), one RLS helper (owns_portfolio), the policies that
-- use it, and a trigger that seeds ready-made asset classes into every new
-- portfolio.
--
-- Unlike the budgeting tables, nothing here is shared. Access is decided by
-- "did you create this portfolio?" rather than "are you a member of this
-- budget?". That makes the security rules simpler than the budget side.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The container. Like `budgets`, but with no members table — the creator is
-- the only person who will ever see it.
create table public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

-- The groups inside a portfolio. Like `categories` inside a budget.
-- Ready-made ones are seeded by the trigger below; users can add their own.
-- Soft-deleted (archived) so historical holdings keep their grouping.
create table public.asset_classes (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  name          text not null,
  is_archived   boolean not null default false,
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now()
);

-- The actual things owned. Value-tracked: two money figures and the gap
-- between them is the profit/loss.
-- We store `portfolio_id` directly (as well as `asset_class_id`) on purpose —
-- see the note on the holdings policies below.
create table public.holdings (
  id                   uuid primary key default gen_random_uuid(),
  portfolio_id         uuid not null references public.portfolios (id) on delete cascade,
  asset_class_id       uuid not null references public.asset_classes (id),
  name                 text not null,
  ticker               text,
  currency             text not null default 'PKR',
  original_investment  numeric not null default 0,
  current_value        numeric not null default 0,
  current_value_at     timestamptz,
  notes                text,
  is_archived          boolean not null default false,
  created_by           uuid not null default auth.uid() references auth.users (id),
  created_at           timestamptz not null default now()
);

-- One row per value update, so the per-holding progression graph has history
-- to draw. `as_of` is the date the value applies to (defaults to today, but
-- can be back-dated if you're entering an old value).
create table public.holding_value_history (
  id            uuid primary key default gen_random_uuid(),
  holding_id    uuid not null references public.holdings (id) on delete cascade,
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  value         numeric not null,
  as_of         date not null default current_date,
  created_by    uuid not null default auth.uid() references auth.users (id),
  created_at    timestamptz not null default now()
);

-- Indexes on the foreign keys we filter and join on.
create index on public.asset_classes (portfolio_id);
create index on public.holdings (portfolio_id);
create index on public.holdings (asset_class_id);
create index on public.holding_value_history (holding_id);
create index on public.holding_value_history (portfolio_id);

-- ---------------------------------------------------------------------------
-- 2. RLS helper
-- ---------------------------------------------------------------------------

-- True when the current user created the given portfolio. The child tables
-- (asset_classes, holdings, value history) all gate on this. It's
-- `security definer` and owned by `postgres` so it can read `portfolios`
-- regardless of that table's own RLS — same requirement the budget helper
-- functions have.
create or replace function public.owns_portfolio(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.portfolios
    where id = p_id
      and created_by = auth.uid()
  );
$$;

alter function public.owns_portfolio(uuid) owner to postgres;

-- ---------------------------------------------------------------------------
-- 3. Row level security
-- ---------------------------------------------------------------------------

alter table public.portfolios            enable row level security;
alter table public.asset_classes         enable row level security;
alter table public.holdings              enable row level security;
alter table public.holding_value_history enable row level security;

-- Portfolios: ownership is direct. No helper needed (and using one here would
-- recurse, since the helper reads this very table).
create policy "read own portfolios"   on public.portfolios for select using (created_by = auth.uid());
create policy "insert own portfolios" on public.portfolios for insert with check (created_by = auth.uid());
create policy "update own portfolios" on public.portfolios for update using (created_by = auth.uid());
create policy "delete own portfolios" on public.portfolios for delete using (created_by = auth.uid());

-- Asset classes: gated by ownership of the parent portfolio.
create policy "read asset_classes"   on public.asset_classes for select using (owns_portfolio(portfolio_id));
create policy "insert asset_classes" on public.asset_classes for insert with check (owns_portfolio(portfolio_id));
create policy "update asset_classes" on public.asset_classes for update using (owns_portfolio(portfolio_id));
create policy "delete asset_classes" on public.asset_classes for delete using (owns_portfolio(portfolio_id));

-- Holdings: same gate. This is why we keep `portfolio_id` on the row — the
-- policy is one clean check, instead of walking holding -> asset_class ->
-- portfolio. (On the budget side, items had to walk through categories, which
-- needed extra helper functions and tripped up PostgREST embedding. Carrying
-- the parent id avoids all of that.)
create policy "read holdings"   on public.holdings for select using (owns_portfolio(portfolio_id));
create policy "insert holdings" on public.holdings for insert with check (owns_portfolio(portfolio_id));
create policy "update holdings" on public.holdings for update using (owns_portfolio(portfolio_id));
create policy "delete holdings" on public.holdings for delete using (owns_portfolio(portfolio_id));

-- Value history: same gate.
create policy "read value_history"   on public.holding_value_history for select using (owns_portfolio(portfolio_id));
create policy "insert value_history" on public.holding_value_history for insert with check (owns_portfolio(portfolio_id));
create policy "update value_history" on public.holding_value_history for update using (owns_portfolio(portfolio_id));
create policy "delete value_history" on public.holding_value_history for delete using (owns_portfolio(portfolio_id));

-- ---------------------------------------------------------------------------
-- 4. Seed ready-made asset classes on portfolio creation
-- ---------------------------------------------------------------------------

-- Mirrors `on_budget_created` (which auto-adds the creator as owner). When a
-- portfolio is created, drop in a starter set of asset classes. Users can
-- archive the ones they don't want and add their own. `security definer` +
-- owned by postgres so the inserts run cleanly regardless of RLS timing.
create or replace function public.seed_default_asset_classes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.asset_classes (portfolio_id, name, created_by)
  values
    (new.id, 'Stocks',          new.created_by),
    (new.id, 'ETF',             new.created_by),
    (new.id, 'Mutual Fund',     new.created_by),
    (new.id, 'Commodity',       new.created_by),
    (new.id, 'Property',        new.created_by),
    (new.id, 'Retirement Fund', new.created_by),
    (new.id, 'Forex',           new.created_by),
    (new.id, 'Cash',            new.created_by),
    (new.id, 'Other',           new.created_by);
  return new;
end;
$$;

alter function public.seed_default_asset_classes() owner to postgres;

create trigger on_portfolio_created
  after insert on public.portfolios
  for each row execute function public.seed_default_asset_classes();

