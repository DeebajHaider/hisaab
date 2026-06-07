-- The trigger was firing during cascade deletes triggered by budget
-- deletion, blocking the removal of the last owner row even though
-- the budget itself was being permanently deleted.
--
-- Fix: in the DELETE path, check whether the parent budget still
-- exists. If it doesn't, this is a legitimate cascade — the ownerless
-- state is irrelevant because the budget is gone. Normal last-owner
-- protection still applies for all other delete paths.

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_count int;
begin
  if tg_op = 'UPDATE' then
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_owner_count
      from public.budget_members
      where budget_id = old.budget_id
        and role = 'owner';
      if v_owner_count <= 1 then
        raise exception 'cannot_remove_last_owner' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      -- If the parent budget no longer exists, this deletion is part of
      -- a cascade from the budget being deleted. An ownerless budget is
      -- fine here because the budget itself is gone — skip the check.
      if not exists (
        select 1 from public.budgets where id = old.budget_id
      ) then
        return old;
      end if;

      select count(*) into v_owner_count
      from public.budget_members
      where budget_id = old.budget_id
        and role = 'owner';
      if v_owner_count <= 1 then
        raise exception 'cannot_remove_last_owner' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;