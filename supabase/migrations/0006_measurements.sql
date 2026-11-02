-- DATABASE.md §2.7–2.9, §6, §9.6 — measurements (current set per cloth), values, history.
-- Values are stored in inches; cm is converted for display only.

-- 2.7 measurements
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id),
  notes text check (char_length(notes) <= 300),
  measured_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.measurements enable row level security;
create unique index measurements_current_key on public.measurements (customer_id, garment_type_id)
  where deleted_at is null;
create index measurements_garment_type_idx on public.measurements (garment_type_id);
create index measurements_sync_idx on public.measurements (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.measurements
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.measurements
  for each row execute function public.assert_same_shop(
    'customers', 'customer_id', 'garment_types', 'garment_type_id');

-- 2.8 measurement_values — one value per field (measurements ↔ measurement_fields)
create table public.measurement_values (
  measurement_id uuid not null references public.measurements (id) on delete cascade,
  field_id uuid not null references public.measurement_fields (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  value_in numeric(6, 2) not null check (value_in > 0 and value_in <= 999.99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (measurement_id, field_id)
);
alter table public.measurement_values enable row level security;
create index measurement_values_field_idx on public.measurement_values (field_id);
-- No `id` column: the sync cursor tie-breaks on the composite key instead (Phase 5).
create index measurement_values_sync_idx
  on public.measurement_values (shop_id, updated_at, measurement_id, field_id);
create trigger set_updated_at before insert or update on public.measurement_values
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.measurement_values
  for each row execute function public.assert_same_shop(
    'measurements', 'measurement_id', 'measurement_fields', 'field_id');

-- 2.9 measurement_versions — history snapshots (append-only, no deleted_at)
create table public.measurement_versions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  measurement_id uuid not null references public.measurements (id) on delete cascade,
  "values" jsonb not null,
  notes text,
  measured_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.measurement_versions enable row level security;
create index measurement_versions_measurement_idx
  on public.measurement_versions (measurement_id, created_at desc);
create index measurement_versions_sync_idx on public.measurement_versions (shop_id, updated_at, id);
create trigger set_updated_at before insert or update on public.measurement_versions
  for each row execute function public.set_updated_at();
create trigger assert_same_shop before insert or update on public.measurement_versions
  for each row execute function public.assert_same_shop('measurements', 'measurement_id');
