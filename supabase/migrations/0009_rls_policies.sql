-- DATABASE.md §7 / §9.9 — RLS on every table + all MVP policies + protect_shop_columns.
-- Owners only ever reach rows of their own shop; anon reaches nothing. Policies wrap
-- auth.uid() / current_shop_id() in (select …) so they are evaluated once per statement.

-- ---------------------------------------------------------------------------------------------
-- Privileges first: least privilege, then RLS narrows rows.
-- ---------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- No hard deletes from the app (soft delete with deleted_at). Revoking DELETE makes a DELETE
-- fail with 42501 (HTTP 403, API.md §3.2) instead of silently matching zero rows.
revoke delete, truncate on all tables in schema public from authenticated;

-- Server-written tables.
revoke insert, update on public.subscriptions from authenticated;
-- Profiles are created by the on_auth_user_created trigger only.
revoke insert on public.profiles from authenticated;
-- Shops are created by create_shop() only.
revoke insert on public.shops from authenticated;
-- The totals view is read-only.
revoke insert, update on public.order_totals from authenticated;

-- RLS on every table (already enabled when each table was created; repeated so this file
-- alone documents the rule).
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.subscriptions enable row level security;
alter table public.garment_types enable row level security;
alter table public.measurement_fields enable row level security;
alter table public.customers enable row level security;
alter table public.measurements enable row level security;
alter table public.measurement_values enable row level security;
alter table public.measurement_versions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_extras enable row level security;
alter table public.payments enable row level security;

-- ---------------------------------------------------------------------------------------------
-- profiles: own row only; insert via trigger; no delete (account deletion function).
-- ---------------------------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- shops: own shop; insert via create_shop(); owner_id / next_order_no protected by trigger.
-- ---------------------------------------------------------------------------------------------
create policy shops_select on public.shops for select to authenticated
  using (owner_id = (select auth.uid()));
create policy shops_update on public.shops for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create or replace function public.protect_shop_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only API roles are restricted; SECURITY DEFINER functions (claim_order_no) run as owner.
  if current_user in ('authenticated', 'anon')
     and (new.owner_id is distinct from old.owner_id
          or new.next_order_no is distinct from old.next_order_no) then
    raise exception 'PROTECTED_COLUMN' using errcode = '42501',
      detail = 'owner_id and next_order_no cannot be changed by the app';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_shop_columns() from public, anon, authenticated;
create trigger protect_shop_columns before update on public.shops
  for each row execute function public.protect_shop_columns();

-- ---------------------------------------------------------------------------------------------
-- subscriptions: read own; written by the service role only (RevenueCat webhook).
-- ---------------------------------------------------------------------------------------------
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (shop_id = (select public.current_shop_id()));

-- ---------------------------------------------------------------------------------------------
-- Shop-scoped tables: read/insert/update own shop; no delete (soft delete).
-- customers and orders inserts also need an active plan (read-only mode, PRD M14).
-- ---------------------------------------------------------------------------------------------
create policy customers_select on public.customers for select to authenticated
  using (shop_id = (select public.current_shop_id()));
create policy customers_insert on public.customers for insert to authenticated
  with check (shop_id = (select public.current_shop_id()) and (select public.shop_can_write()));
create policy customers_update on public.customers for update to authenticated
  using (shop_id = (select public.current_shop_id()))
  with check (shop_id = (select public.current_shop_id()));

create policy orders_select on public.orders for select to authenticated
  using (shop_id = (select public.current_shop_id()));
create policy orders_insert on public.orders for insert to authenticated
  with check (shop_id = (select public.current_shop_id()) and (select public.shop_can_write()));
create policy orders_update on public.orders for update to authenticated
  using (shop_id = (select public.current_shop_id()))
  with check (shop_id = (select public.current_shop_id()));

-- Same select/insert/update policy set for every other shop-scoped table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'garment_types', 'measurement_fields', 'measurements', 'measurement_values',
    'measurement_versions', 'order_items', 'order_extras', 'payments'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (shop_id = (select public.current_shop_id()))', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated
         with check (shop_id = (select public.current_shop_id()))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated
         using (shop_id = (select public.current_shop_id()))
         with check (shop_id = (select public.current_shop_id()))', t);
  end loop;
end;
$$;
