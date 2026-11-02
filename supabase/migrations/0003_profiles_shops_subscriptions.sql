-- DATABASE.md §2.1–2.3, §7 helpers, §9.3.
-- RLS is enabled as each table is created (deny-all until 0009 adds policies), so no table is
-- ever exposed without RLS between migrations.

-- 2.1 profiles — one per signed-in owner (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 60),
  email text,
  phone text check (phone ~ '^[6-9][0-9]{9}$'),
  language public.app_language not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger set_updated_at before insert or update on public.profiles
  for each row execute function public.set_updated_at();

-- 2.2 shops — one shop per owner (MVP)
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  phone text check (phone ~ '^[6-9][0-9]{9}$'),
  gstin text check (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  upi_id text check (upi_id ~ '^[\w.\-]{2,}@[A-Za-z][A-Za-z0-9]+$'),
  default_gst_rate smallint not null default 0 check (default_gst_rate in (0, 5, 12, 18)),
  measurement_unit public.measurement_unit not null default 'in',
  weekly_off_day smallint check (weekly_off_day between 0 and 6),
  next_order_no integer not null default 1001 check (next_order_no > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.shops enable row level security;
create trigger set_updated_at before insert or update on public.shops
  for each row execute function public.set_updated_at();

-- 2.3 subscriptions — plan state per shop (written only by the server)
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  plan public.plan_code not null default 'trial',
  status public.plan_status not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  current_period_end timestamptz,
  provider text not null default 'revenuecat',
  provider_customer_id text,
  last_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create trigger set_updated_at before insert or update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Profile for every new auth user (on_auth_user_created). full_name from sign-up metadata,
-- else "Owner"; phone kept only if it is a valid 10-digit Indian mobile (auth stores 91…).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  local_phone text := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    case when char_length(meta_name) between 2 and 60 then meta_name else 'Owner' end,
    new.email,
    case when local_phone ~ '^[6-9][0-9]{9}$' then local_phone end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The signed-in owner's shop (DATABASE.md §7). STABLE + SECURITY DEFINER so RLS policies can
-- call it once per statement without recursing into the shops policy.
create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.shops
  where owner_id = (select auth.uid()) and deleted_at is null
  limit 1
$$;

-- Can the shop create new customers/orders? (trialing in trial, active, grace) — PRD M14.
create or replace function public.shop_can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.shop_id = (select public.current_shop_id())
      and (s.status in ('active', 'grace')
           or (s.status = 'trialing' and s.trial_ends_at > now()))
  )
$$;

-- Used inside RLS policies, so the signed-in role must be able to call them; anon never.
revoke execute on function public.current_shop_id() from public, anon;
revoke execute on function public.shop_can_write() from public, anon;
grant execute on function public.current_shop_id() to authenticated;
grant execute on function public.shop_can_write() to authenticated;
