-- ── 1. Transfer budget ownership ─────────────────────────────────────────────
-- Atomically promotes p_new_owner_id to owner and demotes the calling user
-- to editor. Both UPDATEs happen in the same transaction — either both
-- succeed or neither does.
--
-- Guards: calling user must be the current owner; target must be a member.

create or replace function public.transfer_budget_ownership(
  p_budget_id    uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.budget_members
     where budget_id = p_budget_id
       and user_id   = auth.uid()
       and role      = 'owner'
  ) then
    raise exception 'not_owner';
  end if;

  if not exists (
    select 1 from public.budget_members
     where budget_id = p_budget_id
       and user_id   = p_new_owner_id
  ) then
    raise exception 'not_member';
  end if;

  update public.budget_members
     set role = 'owner'
   where budget_id = p_budget_id
     and user_id   = p_new_owner_id;

  update public.budget_members
     set role = 'editor'
   where budget_id = p_budget_id
     and user_id   = auth.uid();
end;
$$;

alter function public.transfer_budget_ownership(uuid, uuid) owner to postgres;


-- ── 2. Get owned shared budgets ───────────────────────────────────────────────
-- Returns every budget where the calling user is owner AND at least one
-- other member exists. Used by the account-deletion pre-flight check so
-- the UI can block deletion and list the budgets that need ownership
-- transferred first.

create or replace function public.get_owned_shared_budgets()
returns table (budget_id uuid, budget_name text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id   as budget_id,
         b.name as budget_name
    from public.budget_members bm
    join public.budgets        b on b.id = bm.budget_id
   where bm.user_id = auth.uid()
     and bm.role    = 'owner'
     and exists (
           select 1
             from public.budget_members bm2
            where bm2.budget_id = bm.budget_id
              and bm2.user_id  != auth.uid()
         )
   order by b.name;
$$;

alter function public.get_owned_shared_budgets() owner to postgres;


-- ── 3. Delete own account ─────────────────────────────────────────────────────
-- Removes the calling user's data and auth record in a single transaction.
-- Either everything is deleted or nothing is — genuine atomicity.
--
-- Sequence:
--   1. Guard: reject if any owned shared budgets remain. The UI prevents
--      this but the function enforces it server-side too.
--   2. Delete portfolios (cascades to asset classes, holdings, history).
--   3. Null out created_by on records in shared budgets — those records
--      belong to the budget and must survive the user's departure.
--   4. Leave all non-owned budgets (remove from budget_members).
--   5. Delete solo-owned budgets; cascade removes all their data
--      (members, categories, items, people, transactions, income, savings).
--   6. Delete the auth.users row. Supabase cascades sessions, tokens,
--      and the profiles row.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- 1. Guard: no owned shared budgets may remain
  if exists (
    select 1
      from public.budget_members bm
     where bm.user_id = v_uid
       and bm.role    = 'owner'
       and exists (
             select 1
               from public.budget_members bm2
              where bm2.budget_id = bm.budget_id
                and bm2.user_id  != v_uid
           )
  ) then
    raise exception 'has_shared_budgets';
  end if;

  -- 2. Portfolios
  delete from public.portfolios where created_by = v_uid;

  -- 3. Null out created_by on shared-budget records that outlive this user.
  --    Records in owned-solo budgets are about to cascade-delete anyway,
  --    so this update is a no-op for those rows — but it is necessary for
  --    transactions the user logged in budgets they were a non-owner member of.
  update public.transactions    set created_by = null where created_by = v_uid;
  update public.income_entries  set created_by = null where created_by = v_uid;
  update public.savings_entries set created_by = null where created_by = v_uid;

  -- 4. Leave non-owned budgets
  delete from public.budget_members
   where user_id = v_uid
     and role   != 'owner';

  -- 5. Delete solo-owned budgets
  delete from public.budgets b
   where exists (
           select 1
             from public.budget_members bm
            where bm.budget_id = b.id
              and bm.user_id   = v_uid
              and bm.role      = 'owner'
         );

  -- 6. Delete auth record (cascades to profiles, sessions, tokens)
  delete from auth.users where id = v_uid;
end;
$$;

alter function public.delete_own_account() owner to postgres;