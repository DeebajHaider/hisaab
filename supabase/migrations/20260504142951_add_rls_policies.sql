-- ============================================================================
-- Migration: add_rls_policies
-- Locks down all tables with Row Level Security and adds policies that
-- enforce the multi-user budget sharing model.
-- ============================================================================

-- Step 1: Enable RLS on every table.
-- WARNING: enabling RLS without policies = complete lockout.
-- We add policies in the next sections to unlock specific access.
alter table public.budgets           enable row level security;
alter table public.budget_members    enable row level security;
alter table public.categories        enable row level security;
alter table public.items             enable row level security;
alter table public.people            enable row level security;
alter table public.transactions      enable row level security;
alter table public.income_entries    enable row level security;
alter table public.savings_entries   enable row level security;



-- ----------------------------------------------------------------------------
-- Helper: is the current authenticated user a member of this budget?
-- Used in nearly every policy below.
--
-- `security definer` means this function runs with the privileges of its
-- owner (the database superuser), bypassing RLS on budget_members.
-- Without this, the function itself would be subject to RLS and we'd have
-- a chicken-and-egg problem (need to check membership to read membership).
--
-- `stable` tells Postgres the result doesn't change within a single query,
-- so it can cache and reuse the result. Important for performance — this
-- function gets called on every row of every query.
-- ----------------------------------------------------------------------------
create or replace function public.is_budget_member(b_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.budget_members
    where budget_id = b_id
      and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Helper: does the current user have at least the given role on this budget?
-- Roles ordered: viewer < editor < owner.
-- ----------------------------------------------------------------------------
create or replace function public.has_budget_role(b_id uuid, min_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.budget_members
    where budget_id = b_id
      and user_id = auth.uid()
      and case min_role
        when 'viewer' then role in ('viewer', 'editor', 'owner')
        when 'editor' then role in ('editor', 'owner')
        when 'owner'  then role = 'owner'
      end
  );
$$;






-- ============================================================================
-- Policies: budgets
-- ============================================================================

-- SELECT: you can see budgets you're a member of.
create policy "Members can read budgets"
  on public.budgets
  for select
  using (public.is_budget_member(id));

-- INSERT: you can create a budget, and you must be the creator.
-- (The trigger we wrote earlier will auto-add you as owner in budget_members.)
create policy "Authenticated users can create budgets"
  on public.budgets
  for insert
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
  );

-- UPDATE: only owners can rename/modify a budget.
create policy "Owners can update budgets"
  on public.budgets
  for update
  using (public.has_budget_role(id, 'owner'))
  with check (public.has_budget_role(id, 'owner'));

-- DELETE: only owners can delete a budget.
-- Cascade deletes everything (members, categories, items, transactions, etc.).
create policy "Owners can delete budgets"
  on public.budgets
  for delete
  using (public.has_budget_role(id, 'owner'));


-- ============================================================================
-- Policies: budget_members
-- ============================================================================

-- SELECT: you can see members of any budget you're in.
-- (So you can see who else is in your family budget.)
create policy "Members can read membership of their budgets"
  on public.budget_members
  for select
  using (public.is_budget_member(budget_id));

-- INSERT: only owners can add members to a budget.
-- (Self-add via the trigger doesn't go through RLS because the trigger uses security definer.)
create policy "Owners can add members"
  on public.budget_members
  for insert
  with check (public.has_budget_role(budget_id, 'owner'));

-- UPDATE: only owners can change roles.
create policy "Owners can update member roles"
  on public.budget_members
  for update
  using (public.has_budget_role(budget_id, 'owner'))
  with check (public.has_budget_role(budget_id, 'owner'));

-- DELETE: owners can remove anyone, members can remove themselves.
create policy "Owners can remove members or members can leave"
  on public.budget_members
  for delete
  using (
    public.has_budget_role(budget_id, 'owner')
    or user_id = auth.uid()
  );

-- ============================================================================
-- Policies: categories
-- ============================================================================

create policy "Members can read categories"
  on public.categories
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create categories"
  on public.categories
  for insert
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can update categories"
  on public.categories
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete categories"
  on public.categories
  for delete
  using (public.has_budget_role(budget_id, 'editor'));

-- ============================================================================
-- Policies: items (budget access is via category)
-- ============================================================================

-- We have to look up the budget_id through the categories table.
-- Wrap in a helper to keep policies clean:
create or replace function public.is_item_budget_member(item_category_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_budget_member(c.budget_id)
  from public.categories c
  where c.id = item_category_id;
$$;

create or replace function public.has_item_budget_role(item_category_id uuid, min_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_budget_role(c.budget_id, min_role)
  from public.categories c
  where c.id = item_category_id;
$$;

create policy "Members can read items"
  on public.items
  for select
  using (public.is_item_budget_member(category_id));

create policy "Editors can create items"
  on public.items
  for insert
  with check (public.has_item_budget_role(category_id, 'editor'));

create policy "Editors can update items"
  on public.items
  for update
  using (public.has_item_budget_role(category_id, 'editor'))
  with check (public.has_item_budget_role(category_id, 'editor'));

create policy "Editors can delete items"
  on public.items
  for delete
  using (public.has_item_budget_role(category_id, 'editor'));

-- ============================================================================
-- Policies: people
-- ============================================================================

create policy "Members can read people"
  on public.people
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create people"
  on public.people
  for insert
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can update people"
  on public.people
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete people"
  on public.people
  for delete
  using (public.has_budget_role(budget_id, 'editor'));

-- ============================================================================
-- Policies: transactions
-- ============================================================================

create policy "Members can read transactions"
  on public.transactions
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create transactions"
  on public.transactions
  for insert
  with check (
    public.has_budget_role(budget_id, 'editor')
    and created_by = auth.uid()
  );

create policy "Editors can update any transaction"
  on public.transactions
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete any transaction"
  on public.transactions
  for delete
  using (public.has_budget_role(budget_id, 'editor'));

-- ============================================================================
-- Policies: income_entries
-- ============================================================================

create policy "Members can read income"
  on public.income_entries
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create income"
  on public.income_entries
  for insert
  with check (
    public.has_budget_role(budget_id, 'editor')
    and created_by = auth.uid()
  );

create policy "Editors can update any income"
  on public.income_entries
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete any income"
  on public.income_entries
  for delete
  using (public.has_budget_role(budget_id, 'editor'));

-- ============================================================================
-- Policies: savings_entries
-- ============================================================================

create policy "Members can read savings"
  on public.savings_entries
  for select
  using (public.is_budget_member(budget_id));

create policy "Editors can create savings"
  on public.savings_entries
  for insert
  with check (
    public.has_budget_role(budget_id, 'editor')
    and created_by = auth.uid()
  );

create policy "Editors can update any savings"
  on public.savings_entries
  for update
  using (public.has_budget_role(budget_id, 'editor'))
  with check (public.has_budget_role(budget_id, 'editor'));

create policy "Editors can delete any savings"
  on public.savings_entries
  for delete
  using (public.has_budget_role(budget_id, 'editor'));















