-- DATABASE.md §2.6, §6, §9.5 — customers. Phone and book_no are deliberately NOT unique
-- (family members share them, V2); the app warns on duplicates.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 50),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  book_no text check (char_length(book_no) <= 12),
  area text check (char_length(area) <= 100),
  family_root_id uuid references public.customers (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.customers enable row level security;
create index customers_sync_idx on public.customers (shop_id, updated_at, id);
create index customers_phone_idx on public.customers (shop_id, phone);
create index customers_book_no_idx on public.customers (shop_id, book_no)
  where book_no is not null and deleted_at is null;
create index customers_name_prefix_idx on public.customers (shop_id, lower(name) text_pattern_ops)
  where deleted_at is null;
create index customers_family_root_idx on public.customers (family_root_id)
  where family_root_id is not null;
create trigger set_updated_at before insert or update on public.customers
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.customers
  for each row execute function public.assert_same_shop('customers', 'family_root_id');
