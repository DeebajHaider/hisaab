-- Replaces client-side aggregation in useMonthlyTotals and
-- useMonthlyCategoryTotals. Both hooks were hitting PostgREST's
-- 1000-row default limit when querying a multi-year date range,
-- causing older months to show zero spending on the "All" timeframe.
--
-- Security model: SECURITY DEFINER so the functions can read
-- transactions without row-level security getting in the way.
-- Access is gated manually by calling is_budget_member(), which
-- checks the JWT uid against budget_members. An unauthorised caller
-- sees an empty result rather than an error — same silent behaviour
-- as the existing RLS helper functions.
--
-- is_budget_member() is STABLE with no table-column references in
-- its argument, so the planner treats it as a planning-time constant
-- and short-circuits the whole query when it returns false.

-- ── 1. Monthly spending totals ────────────────────────────────────
-- Feeds MonthlyTotalsChart (the single line chart on the trends page).
-- Returns one row per month that has at least one transaction in range.
-- fillMonthGaps() on the client zero-fills the missing months for the
-- chart x-axis.

create or replace function public.budget_monthly_totals(
  b_id       uuid,
  start_date date,
  end_date   date
)
returns table (year_month text, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(date_trunc('month', t.date), 'YYYY-MM') as year_month,
    sum(t.amount)                                   as total
  from public.transactions t
  where t.budget_id = b_id
    and t.date >= start_date
    and t.date <= end_date
    and public.is_budget_member(b_id)
  group by 1
  order by 1;
$$;

alter function public.budget_monthly_totals(uuid, date, date)
  owner to postgres;

-- ── 2. Monthly spending totals by category ────────────────────────
-- Feeds CategoryComparisonChart and CategoryCompositionChart.
-- Returns narrow rows (one per yearMonth × category); pivotCategoryTotals()
-- on the client reshapes them into the wide Recharts format.
--
-- Includes archived categories and items intentionally — historical
-- spend under an archived category is still real spend and should
-- appear in the chart.

create or replace function public.budget_monthly_category_totals(
  b_id       uuid,
  start_date date,
  end_date   date
)
returns table (
  year_month    text,
  category_id   uuid,
  category_name text,
  total         numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(date_trunc('month', t.date), 'YYYY-MM') as year_month,
    c.id                                            as category_id,
    c.name                                          as category_name,
    sum(t.amount)                                   as total
  from public.transactions t
  join public.items      i on i.id = t.item_id
  join public.categories c on c.id = i.category_id
  where t.budget_id = b_id
    and t.date >= start_date
    and t.date <= end_date
    and public.is_budget_member(b_id)
  group by 1, 2, 3
  order by 1, 3;
$$;

alter function public.budget_monthly_category_totals(uuid, date, date)
  owner to postgres;