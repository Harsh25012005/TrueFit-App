-- DATABASE.md §2.10–2.14, §6, §9.7 — orders, items, extra charges, payments, totals view.
-- Money is integer rupees. Orders are not editable after creation (PRD M7/M8): items and
-- extras are written only by create_order (0008) or by sync push of a new order.

-- 2.10 orders (staff_id is added by 0010, V2)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  order_no integer not null check (order_no > 0),
  status public.order_status not null default 'received',
  order_date date not null default current_date,
  due_date date not null,
  is_urgent boolean not null default false,
  notes text check (char_length(notes) <= 500),
  discount integer not null default 0 check (discount >= 0),
  gst_rate smallint not null default 0 check (gst_rate in (0, 5, 12, 18)),
  ready_on date,
  delivered_on date,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 120),
  created_via text not null default 'app' check (created_via in ('app', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint orders_due_after_order check (due_date >= order_date),
  constraint orders_delivered_on_matches_status check ((status = 'delivered') = (delivered_on is not null)),
  constraint orders_shop_order_no_key unique (shop_id, order_no)
);
alter table public.orders enable row level security;
create index orders_sync_idx on public.orders (shop_id, updated_at, id);
create index orders_active_idx on public.orders (shop_id, status, due_date)
  where deleted_at is null and cancelled_at is null;
create index orders_customer_idx on public.orders (customer_id, order_date desc)
  where deleted_at is null;
create trigger set_updated_at before insert or update on public.orders
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.orders
  for each row execute function public.assert_same_shop('customers', 'customer_id');

-- 2.11 order_items (orders ↔ garment_types). No default rate: the owner types it.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id),
  qty smallint not null check (qty between 1 and 50),
  rate integer not null check (rate between 0 and 200000),
  styles jsonb not null default '{}'::jsonb,
  note text check (char_length(note) <= 120),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.order_items enable row level security;
create index order_items_order_idx on public.order_items (order_id);
create index order_items_garment_type_idx on public.order_items (garment_type_id);
create index order_items_sync_idx on public.order_items (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.order_items
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.order_items
  for each row execute function public.assert_same_shop(
    'orders', 'order_id', 'garment_types', 'garment_type_id');

-- 2.12 order_extras — extra charges (lining, embroidery, urgent fee)
create table public.order_extras (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  amount integer not null check (amount between 1 and 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.order_extras enable row level security;
create index order_extras_order_idx on public.order_extras (order_id);
create index order_extras_sync_idx on public.order_extras (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.order_extras
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.order_extras
  for each row execute function public.assert_same_shop('orders', 'order_id');

-- 2.13 payments — advances, balance payments, refunds (negative)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount integer not null check (amount <> 0 and abs(amount) <= 1000000),
  mode public.payment_mode not null default 'cash',
  paid_on date not null default current_date,
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.payments enable row level security;
create index payments_order_idx on public.payments (order_id);
create index payments_paid_on_idx on public.payments (shop_id, paid_on);
create index payments_sync_idx on public.payments (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.payments
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.payments
  for each row execute function public.assert_same_shop('orders', 'order_id');

-- 2.14 order_totals — server-side reporting; the app computes the same locally.
-- security_invoker so the base tables' RLS applies. Only non-deleted child rows count.
create view public.order_totals
with (security_invoker = true)
as
select
  o.id as order_id,
  o.shop_id,
  t.subtotal,
  t.extras,
  t.base,
  t.tax,
  t.base + t.tax as total,
  p.paid,
  case
    when o.cancelled_at is not null then 0
    else greatest(0, t.base + t.tax - p.paid)
  end as balance
from public.orders o
cross join lateral (
  select
    s.subtotal,
    e.extras,
    greatest(0, s.subtotal + e.extras - o.discount) as base,
    round(greatest(0, s.subtotal + e.extras - o.discount) * o.gst_rate / 100.0)::integer as tax
  from
    (select coalesce(sum(i.qty * i.rate), 0)::integer as subtotal
     from public.order_items i where i.order_id = o.id and i.deleted_at is null) s,
    (select coalesce(sum(x.amount), 0)::integer as extras
     from public.order_extras x where x.order_id = o.id and x.deleted_at is null) e
) t
cross join lateral (
  select coalesce(sum(pm.amount), 0)::integer as paid
  from public.payments pm where pm.order_id = o.id and pm.deleted_at is null
) p;
