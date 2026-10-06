-- One-click presets for recurring income (a salary, a fixed return). Same
-- access rules as transaction_templates: members read, editors write.
create table public.income_templates (
  id          uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references public.budgets(id) on delete cascade,
  source      text not null check (length(source) between 1 and 100),
  amount      numeric(12, 2) not null check (amount >= 0),
  notes       text,
  sort_order  int not null default 0,
  is_archived boolean not null default false,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

create index income_templates_budget_idx on public.income_templates(budget_id, sort_order);

alter table public.income_templates enable row level security;

create policy "Members can read income templates"
  on public.income_templates
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create income templates"
  on public.income_templates
  for insert
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can update income templates"
  on public.income_templates
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete income templates"
  on public.income_templates
  for delete
  using (public.has_budget_role(budget_id, 'editor'));
