-- Only tables whose rows survive account deletion need nullable created_by.
-- Portfolio tables are fully deleted in the function before auth.users is
-- touched, so they need no change. categories, items, and people have no
-- created_by column at all.

alter table public.transactions    alter column created_by drop not null;
alter table public.income_entries  alter column created_by drop not null;
alter table public.savings_entries alter column created_by drop not null;
alter table public.budgets         alter column created_by drop not null;

-- Redefine the function with the corrected null-out list.

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

  -- 3. Null out created_by on records that survive this user's departure:
  --    · transactions / income / savings in shared budgets the user was
  --      a non-owner member of
  --    · budgets where the user was original creator but transferred
  --      ownership (created_by still points to them after the transfer)
  update public.transactions    set created_by = null where created_by = v_uid;
  update public.income_entries  set created_by = null where created_by = v_uid;
  update public.savings_entries set created_by = null where created_by = v_uid;
  update public.budgets         set created_by = null where created_by = v_uid;

  -- 4. Leave all non-owned budgets
  delete from public.budget_members
   where user_id = v_uid
     and role   != 'owner';

  -- 5. Delete solo-owned budgets — cascade removes members, categories,
  --    items, people, transactions, income, savings
  delete from public.budgets b
   where exists (
           select 1
             from public.budget_members bm
            where bm.budget_id = b.id
              and bm.user_id   = v_uid
              and bm.role      = 'owner'
         );

  -- 6. Delete auth record — Supabase cascades sessions, tokens, profiles
  delete from auth.users where id = v_uid;
end;
$$;

alter function public.delete_own_account() owner to postgres;