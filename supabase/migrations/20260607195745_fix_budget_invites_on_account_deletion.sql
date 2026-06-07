-- Add cleanup of budget_invites rows that reference the departing user.
-- Both invited_by (NO ACTION) and accepted_by (NO ACTION) block the
-- auth.users deletion. Deleting the rows is correct:
--   · invited_by = v_uid: invite tokens the user created — no longer
--     meaningful once they're gone
--   · accepted_by = v_uid: records of invites they accepted — acceptable
--     to remove since the budget_members row is the source of truth for
--     membership; the invite record is just an audit trail

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

  -- 2. Portfolios — cascade removes asset_classes, holdings, history
  delete from public.portfolios where created_by = v_uid;

  -- 3. Null out created_by on records that survive this user's departure.
  --    For CASCADE columns (transactions, income, savings, budgets) this
  --    is essential — without it, deleting auth.users would cascade-delete
  --    shared-budget data belonging to other members.
  update public.transactions    set created_by = null where created_by = v_uid;
  update public.income_entries  set created_by = null where created_by = v_uid;
  update public.savings_entries set created_by = null where created_by = v_uid;
  update public.budgets         set created_by = null where created_by = v_uid;

  -- 4. Remove budget invite records referencing this user.
  --    Both invited_by and accepted_by are NO ACTION — they block the
  --    auth.users delete if left in place.
  delete from public.budget_invites
   where invited_by = v_uid
      or accepted_by = v_uid;

  -- 5. Leave all non-owned budgets
  delete from public.budget_members
   where user_id = v_uid
     and role   != 'owner';

  -- 6. Delete solo-owned budgets — cascade removes members, categories,
  --    items, people, transactions, income, savings, and any remaining
  --    budget_invites (if budget_invites.budget_id is also CASCADE)
  delete from public.budgets b
   where exists (
           select 1
             from public.budget_members bm
            where bm.budget_id = b.id
              and bm.user_id   = v_uid
              and bm.role      = 'owner'
         );

  -- 7. Delete auth record — cascades to profiles, sessions, tokens,
  --    and budget_members (user_id CASCADE)
  delete from auth.users where id = v_uid;
end;
$$;

alter function public.delete_own_account() owner to postgres;