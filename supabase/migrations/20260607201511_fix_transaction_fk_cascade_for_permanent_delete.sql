-- Transactions cannot exist without their category or item.
-- Permanently deleting a category or item should cascade to all
-- transactions referencing them, matching the intent of the
-- "Delete permanently" action on the Manage page.
--
-- Both were RESTRICT, which blocked hard deletes entirely.

alter table public.transactions
  drop constraint transactions_category_id_fkey,
  add constraint transactions_category_id_fkey
    foreign key (category_id)
    references public.categories(id)
    on delete cascade;

alter table public.transactions
  drop constraint transactions_item_id_fkey,
  add constraint transactions_item_id_fkey
    foreign key (item_id)
    references public.items(id)
    on delete cascade;