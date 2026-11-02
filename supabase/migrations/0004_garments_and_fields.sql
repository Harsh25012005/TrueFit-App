-- DATABASE.md §2.4–2.5, §6, §9.4 — cloth types and their measurement fields.

-- 2.4 garment_types
create table public.garment_types (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 30),
  sort_order smallint not null default 0,
  style_options jsonb not null default '{}'::jsonb,
  fabric_per_piece_m numeric(4, 1) not null default 0 check (fabric_per_piece_m between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.garment_types enable row level security;
create unique index garment_types_shop_name_key on public.garment_types (shop_id, lower(name))
  where deleted_at is null;
create index garment_types_sync_idx on public.garment_types (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.garment_types
  for each row execute function public.set_updated_at();

-- 2.5 measurement_fields
create table public.measurement_fields (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.measurement_fields enable row level security;
create unique index measurement_fields_garment_name_key
  on public.measurement_fields (garment_type_id, lower(name))
  where deleted_at is null;
create index measurement_fields_order_idx on public.measurement_fields (garment_type_id, sort_order)
  where deleted_at is null;
create index measurement_fields_sync_idx on public.measurement_fields (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.measurement_fields
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.measurement_fields
  for each row execute function public.assert_same_shop('garment_types', 'garment_type_id');
