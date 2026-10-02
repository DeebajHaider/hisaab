-- ----------------------------------------------------------------------------
-- targets: flexible spending goals. A target tracks spending across any mix
-- of whole categories and/or specific items (letting one target mix items
-- from different categories, e.g. a "Subscriptions" target spanning several
-- categories), over an arbitrary date range. No separate "template" entity —
-- renewing an expired target into the next equal-length period is just
-- creating a new row with shifted dates, computed client-side.
-- ----------------------------------------------------------------------------
create table public.targets (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  name            text not null check (length(name) between 1 and 100),
  target_amount   numeric not null check (target_amount > 0),
  start_date      date not null,
  end_date        date not null check (end_date >= start_date),
  category_ids    uuid[] not null default '{}',
  item_ids        uuid[] not null default '{}',
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  check (cardinality(category_ids) > 0 or cardinality(item_ids) > 0)
);

create index targets_budget_idx on public.targets(budget_id, start_date);

alter table public.targets enable row level security;

-- ============================================================================
-- Policies: targets (budget_id is a direct column, same as categories/
-- transaction_templates, so the simple is_budget_member/has_budget_role
-- helpers apply directly).
-- ============================================================================

create policy "Members can read targets"
  on public.targets
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create targets"
  on public.targets
  for insert
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can update targets"
  on public.targets
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete targets"
  on public.targets
  for delete
  using (public.has_budget_role(budget_id, 'editor'));
