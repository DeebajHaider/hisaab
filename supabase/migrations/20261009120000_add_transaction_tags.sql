-- Free-form labels on a transaction (e.g. trip, reimbursable) that cut across categories.
alter table public.transactions
  add column tags text[] not null default '{}';

create index transactions_tags_idx on public.transactions using gin (tags);
