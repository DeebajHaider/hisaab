-- ============================================================================
-- Migration: use_auth_uid_defaults
-- Set created_by to default to auth.uid() so we don't have to pass it from
-- the client. This eliminates the class of bugs where client-supplied
-- created_by doesn't match the JWT, and lets us simplify the INSERT policies.
-- ============================================================================

alter table public.budgets         alter column created_by set default auth.uid();
alter table public.transactions    alter column created_by set default auth.uid();
alter table public.income_entries  alter column created_by set default auth.uid();
alter table public.savings_entries alter column created_by set default auth.uid();
