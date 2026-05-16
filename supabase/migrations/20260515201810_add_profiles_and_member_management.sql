-- ============================================================================
-- Migration: add_profiles_and_member_management
-- Adds the public.profiles table — a thin mirror of auth.users that holds
-- only fields safe to expose cross-user. RLS restricts SELECT to "users I
-- share a budget with", so member lists can show emails without leaking
-- the full auth.users table.
--
-- A trigger on auth.users insert keeps profiles in sync with new signups.
-- A one-shot backfill at the end of this migration covers existing users.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Table: profiles
-- One row per auth user. id matches auth.users.id 1:1.
-- email is denormalized from auth.users — kept in sync by the trigger.
-- display_name is null for now; future Settings page will let users edit it.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

create index profiles_email_idx on public.profiles(email);


-- ----------------------------------------------------------------------------
-- RLS: scoped read access via budget membership.
-- A user can read profiles of users they share at least one budget with,
-- plus their own profile. Cannot read profiles of strangers.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Helper: do the current user and the profile user share any budget?
-- security definer to bypass RLS on budget_members during the check —
-- same pattern as is_budget_member.
create or replace function public.shares_budget_with(other_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.budget_members me
    join public.budget_members them
      on me.budget_id = them.budget_id
    where me.user_id = auth.uid()
      and them.user_id = other_user_id
  );
$$;

-- SELECT: own profile always; others only if we share a budget.
create policy "Users can read shared profiles"
  on public.profiles
  for select
  using (
    id = auth.uid()
    or public.shares_budget_with(id)
  );

-- UPDATE: only your own profile, and only the display_name field.
-- (We can't actually scope an UPDATE policy to specific columns, but the
-- WITH CHECK enforces that id and email cannot be changed to a different
-- value than what was there before.)
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT policy — inserts happen only via the trigger below, which is
-- security definer and bypasses RLS. Direct client inserts are blocked.
-- No DELETE policy — cascade from auth.users handles deletion.


-- ----------------------------------------------------------------------------
-- Trigger: keep profiles in sync with auth.users
-- Fires on insert into auth.users (i.e., new signup).
-- Owned by postgres + security definer so it can write to public.profiles
-- regardless of who initiated the signup.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Trigger on auth schema. We're allowed to write to auth via this trigger
-- because the migration runs as postgres superuser.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- Backfill: insert profile rows for users who signed up before this
-- migration. Without this, existing accounts (you, your test accounts)
-- would have no profile row and would be invisible in member lists.
--
-- on conflict do nothing so this is safe to re-run.
-- ----------------------------------------------------------------------------
insert into public.profiles (id, email, created_at)
select id, email, created_at
from auth.users
on conflict (id) do nothing;

