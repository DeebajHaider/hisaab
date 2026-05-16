-- ============================================================================
-- Migration: add_budget_invites
-- Shareable-link invite flow.
--
-- An owner generates an invite link by inserting a row into budget_invites.
-- The token (a UUID) is the credential — anyone who has the token can accept.
-- Acceptance creates a budget_members row and marks the invite consumed.
--
-- All public-facing logic goes through two security-definer functions:
--   - lookup_invite(token): preview an invite (budget name, role, status)
--   - accept_invite(token): atomically accept and insert membership
--
-- The table itself has owner-only RLS — owners list pending invites and
-- revoke them from the management UI. The functions bypass RLS to serve
-- the link-recipient flow.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Table: budget_invites
-- ----------------------------------------------------------------------------
create table public.budget_invites (
  id           uuid primary key default gen_random_uuid(),
  budget_id    uuid not null references public.budgets(id) on delete cascade,

  -- Role to grant on acceptance. Owners cannot be invited via link —
  -- new owners must be promoted from editor after acceptance.
  role         text not null check (role in ('editor', 'viewer')),

  -- The unguessable credential. UUID gives 122 bits of entropy, which is
  -- plenty for a family-scale app. Unique so no two invites collide.
  token        uuid not null unique default gen_random_uuid(),

  invited_by   uuid not null references auth.users(id) default auth.uid(),
  created_at   timestamptz not null default now(),

  -- Set when consumed. Both are null while pending.
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id),

  -- Consistency check: either both acceptance fields are set, or both null.
  -- Prevents half-accepted rows if something goes wrong mid-transaction.
  constraint budget_invites_accept_consistency check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  )
);

-- Index the token for fast lookups. Unique constraint already creates one,
-- but being explicit helps with intent.
create index budget_invites_token_idx on public.budget_invites(token);
create index budget_invites_budget_id_idx on public.budget_invites(budget_id);


-- ----------------------------------------------------------------------------
-- RLS: owners-only management. Public access is via the functions below.
-- ----------------------------------------------------------------------------
alter table public.budget_invites enable row level security;

-- SELECT: only owners can list invites for their budget.
-- Link recipients don't go through this path — they use lookup_invite().
create policy "Owners can read budget invites"
  on public.budget_invites
  for select
  using (public.has_budget_role(budget_id, 'owner'));

-- INSERT: only owners can generate invites.
-- invited_by defaults to auth.uid() so we don't need to set it client-side.
create policy "Owners can create budget invites"
  on public.budget_invites
  for insert
  with check (
    public.has_budget_role(budget_id, 'owner')
    and invited_by = auth.uid()
  );

-- DELETE: only owners can revoke pending invites.
create policy "Owners can delete budget invites"
  on public.budget_invites
  for delete
  using (public.has_budget_role(budget_id, 'owner'));

-- No UPDATE policy. Invites are immutable once created.
-- Acceptance happens via accept_invite() which is security definer.


-- ----------------------------------------------------------------------------
-- Function: lookup_invite(token)
-- Returns a thin DTO describing an invite without consuming it.
-- Used by the /invite/:token page to render a preview before the user
-- clicks "Accept".
--
-- Returns null (empty row set) for unknown or invalid tokens.
-- We deliberately don't distinguish "not found" from "malformed" — a
-- vague response is fine and avoids leaking token-space information.
-- ----------------------------------------------------------------------------
create or replace function public.lookup_invite(invite_token uuid)
returns table (
  budget_id      uuid,
  budget_name    text,
  role           text,
  accepted_at    timestamptz,
  already_member boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    bi.budget_id,
    b.name as budget_name,
    bi.role,
    bi.accepted_at,
    -- Tell the UI if the current user is already in this budget.
    -- Drives the "you're already a member" friendly message.
    exists (
      select 1
      from public.budget_members bm
      where bm.budget_id = bi.budget_id
        and bm.user_id = auth.uid()
    ) as already_member
  from public.budget_invites bi
  join public.budgets b on b.id = bi.budget_id
  where bi.token = invite_token;
$$;


-- ----------------------------------------------------------------------------
-- Function: accept_invite(token)
-- Atomically accepts an invite. Race-safe: if two clients call this
-- simultaneously with the same token, only one succeeds.
--
-- Returns the budget_id on success. Raises a specific exception on failure
-- so the UI can render the right message.
--
-- Special case: if the caller is already a member of the target budget,
-- the invite is NOT consumed and we return the budget_id. This means an
-- owner clicking their own invite link doesn't burn it.
-- ----------------------------------------------------------------------------
create or replace function public.accept_invite(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite     public.budget_invites%rowtype;
  v_user_id    uuid := auth.uid();
  v_is_member  boolean;
begin
  -- Must be authenticated to accept.
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Look up the invite. We use SELECT FOR UPDATE to lock the row for the
  -- duration of this transaction, preventing the race where two clients
  -- both pass the "is unaccepted?" check.
  select * into v_invite
  from public.budget_invites
  where token = invite_token
  for update;

  -- Token not found.
  if v_invite.id is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  -- Already a member of this budget? Return budget_id without consuming
  -- the invite. The owner-testing-their-own-link case.
  select exists (
    select 1
    from public.budget_members
    where budget_id = v_invite.budget_id
      and user_id = v_user_id
  ) into v_is_member;

  if v_is_member then
    return v_invite.budget_id;
  end if;

  -- Already consumed by someone else? Reject.
  if v_invite.accepted_at is not null then
    raise exception 'invite_already_used' using errcode = 'P0001';
  end if;

  -- All checks passed. Insert membership and mark invite consumed.
  -- Both writes happen in this transaction — either both succeed or both
  -- roll back.
  insert into public.budget_members (budget_id, user_id, role)
  values (v_invite.budget_id, v_user_id, v_invite.role);

  update public.budget_invites
  set accepted_at = now(),
      accepted_by = v_user_id
  where id = v_invite.id;

  return v_invite.budget_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- Trigger: prevent_last_owner_removal
-- Blocks deletion or role-demotion of the last owner of a budget.
-- The UI also checks this, but we enforce at the DB layer as the source
-- of truth — otherwise an API call could leave a budget ownerless.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_count int;
begin
  -- On UPDATE: only care if someone was demoted from owner.
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

  -- On DELETE: only care if the deleted row was an owner.
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
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

create trigger prevent_last_owner_removal_trigger
  before update or delete on public.budget_members
  for each row execute function public.prevent_last_owner_removal();

  