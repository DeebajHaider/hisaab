-- Persists the manually-entered FX blend rate per foreign currency on a
-- portfolio's overview page. Previously component-local state only, reset
-- on every reload. A flat {currency: rate} map is all the UI needs — no
-- historical rates, no per-date tracking.
alter table public.portfolios
  add column fx_rates jsonb not null default '{}'::jsonb;
