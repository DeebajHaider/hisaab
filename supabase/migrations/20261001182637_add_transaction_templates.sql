-- ----------------------------------------------------------------------------
-- transaction_templates: saved transaction presets for one-click quick-add.
-- Shape mirrors transactions (same value fields) plus the archive/ordering
-- fields categories/items already have. Deliberately NOT a recurring/
-- scheduled mechanism — clicking a template just creates a normal
-- transaction row for whichever day the user is viewing when they click it.
-- ----------------------------------------------------------------------------
create table public.transaction_templates (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  category_id     uuid not null references public.categories(id) on delete cascade,
  item_id         uuid not null references public.items(id) on delete cascade,
  label           text,                          -- optional display override (e.g. "Netflix" vs item "Subscription")
  amount          numeric not null check (amount >= 0),
  rate            numeric,
  qty             numeric,
  person_id       uuid references public.people(id) on delete set null,
  notes           text,
  sort_order      int not null default 0,
  is_archived     boolean not null default false,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now()
);

create index transaction_templates_budget_idx on public.transaction_templates(budget_id, sort_order);

alter table public.transaction_templates enable row level security;

-- ============================================================================
-- Policies: transaction_templates (budget_id is a direct column, same as
-- categories/transactions, so the simple is_budget_member/has_budget_role
-- helpers apply directly — no need for the items-style two-hop indirection).
-- ============================================================================

create policy "Members can read transaction templates"
  on public.transaction_templates
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create transaction templates"
  on public.transaction_templates
  for insert
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can update transaction templates"
  on public.transaction_templates
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete transaction templates"
  on public.transaction_templates
  for delete
  using (public.has_budget_role(budget_id, 'editor'));
