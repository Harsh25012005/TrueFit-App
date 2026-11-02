-- DATABASE.md §7 RPC functions / §9.8 — create_shop, claim_order_no, next_book_no,
-- create_order, set_order_status, save_measurement (+ internal helpers).
--
-- Error conventions (mapped by src/lib/errors.ts to API.md §2):
--   28000 → UNAUTHENTICATED · PT402 → PLAN_REQUIRED (PostgREST returns HTTP 402)
--   P0002 → NOT_FOUND (HTTP 404) · P0001 → BUSINESS_RULE, reason = message
--   23505 → CONFLICT · 23514 → VALIDATION_FAILED

-- Today's date for the shop (India). The database runs in UTC, so current_date would still be
-- "yesterday" between 00:00 and 05:30 IST.
create or replace function public.shop_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

-- Shirt and Pant with their default fields (PRD M4, DATABASE.md §8).
create or replace function public.add_default_garments(p_shop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shirt uuid;
  pant uuid;
begin
  insert into public.garment_types (shop_id, name, sort_order, style_options, fabric_per_piece_m)
  values (p_shop, 'Shirt', 0,
          '{"Collar":["Regular","Mandarin"],"Fit":["Regular","Slim"],"Pocket":["One","Two","None"],"Sleeve":["Full","Half"]}',
          1.6)
  returning id into shirt;
  insert into public.garment_types (shop_id, name, sort_order, style_options, fabric_per_piece_m)
  values (p_shop, 'Pant', 1,
          '{"Fit":["Regular","Slim"],"Pleats":["None","Single","Double"],"Bottom":["Plain","Turn-up"]}',
          1.2)
  returning id into pant;

  insert into public.measurement_fields (shop_id, garment_type_id, name, sort_order)
  select p_shop, shirt, f.name, (f.ord - 1)::smallint
  from unnest(array['Length', 'Chest', 'Waist', 'Shoulder', 'Sleeve', 'Collar', 'Cuff'])
       with ordinality as f(name, ord);
  insert into public.measurement_fields (shop_id, garment_type_id, name, sort_order)
  select p_shop, pant, f.name, (f.ord - 1)::smallint
  from unnest(array['Length', 'Waist', 'Hip', 'Thigh', 'Knee', 'Bottom', 'Inseam'])
       with ordinality as f(name, ord);
end;
$$;

-- "Try with sample data" (PRD F1). Same customers/orders as supabase/seed.sql; PLAN 10.3 makes
-- it larger. Inserts directly (bypassing create_order) because it is server-generated.
create or replace function public.add_sample_data(p_shop uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.shop_today();
  shirt uuid;
  pant uuid;
  amit uuid := gen_random_uuid();
  priya uuid := gen_random_uuid();
  rahul uuid := gen_random_uuid();
  m uuid;
  o1 uuid := gen_random_uuid();
  o2 uuid := gen_random_uuid();
  o3 uuid := gen_random_uuid();
  first_no integer;
begin
  select id into shirt from public.garment_types where shop_id = p_shop and name = 'Shirt';
  select id into pant from public.garment_types where shop_id = p_shop and name = 'Pant';

  insert into public.customers (id, shop_id, name, phone, book_no) values
    (amit, p_shop, 'Amit Shah', '9824012345', '101'),
    (priya, p_shop, 'Priya Desai', '9898123456', '102'),
    (rahul, p_shop, 'Rahul Mehta', '9727011223', '103');

  -- measurement values in field sort order
  insert into public.measurements (shop_id, customer_id, garment_type_id, measured_on)
  values (p_shop, amit, shirt, today) returning id into m;
  insert into public.measurement_values (measurement_id, field_id, shop_id, value_in)
  select m, f.id, p_shop, v.value
  from public.measurement_fields f
  join unnest(array[29, 40, 36, 17.5, 24.5, 15.5, 9.5]::numeric[]) with ordinality as v(value, ord)
    on v.ord = f.sort_order + 1
  where f.garment_type_id = shirt;

  insert into public.measurements (shop_id, customer_id, garment_type_id, measured_on)
  values (p_shop, amit, pant, today) returning id into m;
  insert into public.measurement_values (measurement_id, field_id, shop_id, value_in)
  select m, f.id, p_shop, v.value
  from public.measurement_fields f
  join unnest(array[40, 34, 39, 23, 17, 14.5, 30]::numeric[]) with ordinality as v(value, ord)
    on v.ord = f.sort_order + 1
  where f.garment_type_id = pant;

  insert into public.measurements (shop_id, customer_id, garment_type_id, measured_on)
  values (p_shop, priya, shirt, today) returning id into m;
  insert into public.measurement_values (measurement_id, field_id, shop_id, value_in)
  select m, f.id, p_shop, v.value
  from public.measurement_fields f
  join unnest(array[26, 36, 31, 15, 22, 14, 8.5]::numeric[]) with ordinality as v(value, ord)
    on v.ord = f.sort_order + 1
  where f.garment_type_id = shirt;

  update public.shops set next_order_no = next_order_no + 3 where id = p_shop
  returning next_order_no - 3 into first_no;

  insert into public.orders (id, shop_id, customer_id, order_no, status, order_date, due_date,
                             ready_on, delivered_on) values
    (o1, p_shop, amit, first_no, 'received', today - 2, today, null, null),
    (o2, p_shop, priya, first_no + 1, 'ready', today - 3, today + 1, today, null),
    (o3, p_shop, rahul, first_no + 2, 'delivered', today - 8, today - 1, today - 2, today - 1);

  insert into public.order_items (shop_id, order_id, garment_type_id, qty, rate, sort_order) values
    (p_shop, o1, shirt, 2, 650, 0),
    (p_shop, o1, pant, 1, 700, 1),
    (p_shop, o2, shirt, 1, 600, 0),
    (p_shop, o3, pant, 2, 600, 0);

  insert into public.payments (shop_id, order_id, amount, mode, paid_on) values
    (p_shop, o1, 1000, 'cash', today - 2),
    (p_shop, o2, 300, 'upi', today - 3),
    (p_shop, o3, 1200, 'cash', today - 1);
end;
$$;

-- API.md 2.3 — onboarding: profile details, shop, 30-day trial, Shirt + Pant, optional sample.
create or replace function public.create_shop(
  p_shop_name text,
  p_owner_name text,
  p_phone text default null,
  p_language public.app_language default 'en',
  p_with_sample boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  existing uuid;
  shop public.shops;
  sub public.subscriptions;
begin
  if uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select id into existing from public.shops where owner_id = uid;
  if existing is not null then
    raise exception 'SHOP_EXISTS' using errcode = '23505', detail = existing::text;
  end if;

  insert into public.profiles (id, full_name, phone, language)
  values (uid, btrim(p_owner_name), nullif(btrim(p_phone), ''), p_language)
  on conflict (id) do update
    set full_name = excluded.full_name, phone = excluded.phone, language = excluded.language;

  insert into public.shops (owner_id, name, phone)
  values (uid, btrim(p_shop_name), nullif(btrim(p_phone), ''))
  returning * into shop;

  insert into public.subscriptions (shop_id) values (shop.id) returning * into sub;

  perform public.add_default_garments(shop.id);
  if p_with_sample then
    perform public.add_sample_data(shop.id);
    select * into shop from public.shops where id = shop.id;
  end if;

  return jsonb_build_object(
    'id', shop.id,
    'name', shop.name,
    'next_order_no', shop.next_order_no,
    'subscription', jsonb_build_object(
      'plan', sub.plan, 'status', sub.status, 'trial_ends_at', sub.trial_ends_at));
end;
$$;

-- API.md 4.4 — atomically take the next free order number (skips numbers already used by
-- orders pushed from an offline phone).
create or replace function public.claim_order_no()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.current_shop_id();
  n integer;
begin
  if shop is null then
    raise exception 'NO_SHOP' using errcode = 'P0002';
  end if;
  loop
    update public.shops set next_order_no = next_order_no + 1
    where id = shop
    returning next_order_no - 1 into n;
    exit when not exists (select 1 from public.orders where shop_id = shop and order_no = n);
  end loop;
  return n;
end;
$$;

-- API.md 5.3 — highest numeric book number + 1 (non-numeric book numbers are ignored).
create or replace function public.next_book_no()
returns text
language sql
stable
set search_path = ''
as $$
  select (coalesce(max(book_no::bigint), 0) + 1)::text
  from public.customers
  where shop_id = (select public.current_shop_id())
    and deleted_at is null
    and book_no ~ '^[0-9]{1,12}$'
$$;

-- API.md 4.3 — create an order with items, extras and advance in one transaction.
-- Runs as the caller, so RLS (incl. shop_can_write on insert) still applies.
-- Idempotent: calling again with the same order id returns the existing order.
create or replace function public.create_order(
  p_order jsonb,
  p_items jsonb,
  p_extras jsonb default '[]'::jsonb,
  p_advance jsonb default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  shop uuid := public.current_shop_id();
  today date := public.shop_today();
  v_id uuid := coalesce((p_order ->> 'id')::uuid, gen_random_uuid());
  v_customer uuid := (p_order ->> 'customer_id')::uuid;
  v_discount integer := coalesce((p_order ->> 'discount')::integer, 0);
  v_gst smallint := coalesce((p_order ->> 'gst_rate')::smallint, 0);
  v_advance integer := coalesce((p_advance ->> 'amount')::integer, 0);
  v_extras_list jsonb := coalesce(p_extras, '[]'::jsonb);
  item jsonb;
  v_garment uuid;
  v_subtotal bigint := 0;
  v_extras bigint;
  v_base bigint;
  v_total bigint;
  v_no integer;
  existing record;
begin
  if shop is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select o.order_no, t.total, t.paid, t.balance into existing
  from public.orders o join public.order_totals t on t.order_id = o.id
  where o.id = v_id;
  if found then
    return jsonb_build_object('id', v_id, 'order_no', existing.order_no, 'total', existing.total,
                              'paid', existing.paid, 'balance', existing.balance);
  end if;

  if not public.shop_can_write() then
    raise exception 'PLAN_REQUIRED' using errcode = 'PT402';
  end if;

  perform 1 from public.customers where id = v_customer and shop_id = shop and deleted_at is null;
  if not found then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS' using errcode = 'P0001';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    v_garment := (item ->> 'garment_type_id')::uuid;
    perform 1 from public.garment_types
    where id = v_garment and shop_id = shop and deleted_at is null;
    if not found then
      raise exception 'GARMENT_NOT_FOUND' using errcode = 'P0002', detail = v_garment::text;
    end if;
    perform 1 from public.measurements
    where customer_id = v_customer and garment_type_id = v_garment and deleted_at is null;
    if not found then
      raise exception 'MEASUREMENT_MISSING' using errcode = 'P0001', detail = v_garment::text;
    end if;
    if (item ->> 'qty') is null or (item ->> 'rate') is null then
      raise exception 'QTY_AND_RATE_REQUIRED' using errcode = '23514', detail = v_garment::text;
    end if;
    v_subtotal := v_subtotal + (item ->> 'qty')::bigint * (item ->> 'rate')::bigint;
  end loop;

  select coalesce(sum((x ->> 'amount')::bigint), 0) into v_extras
  from jsonb_array_elements(v_extras_list) as x;

  if v_discount > v_subtotal + v_extras then
    raise exception 'DISCOUNT_EXCEEDS_TOTAL' using errcode = 'P0001';
  end if;
  v_base := v_subtotal + v_extras - v_discount;
  v_total := v_base + round(v_base * v_gst / 100.0)::bigint;
  if v_advance < 0 or v_advance > v_total then
    raise exception 'ADVANCE_EXCEEDS_TOTAL' using errcode = 'P0001';
  end if;

  v_no := public.claim_order_no();

  insert into public.orders (id, shop_id, customer_id, order_no, order_date, due_date, is_urgent,
                             notes, discount, gst_rate, created_via)
  values (v_id, shop, v_customer, v_no, today, (p_order ->> 'due_date')::date,
          coalesce((p_order ->> 'is_urgent')::boolean, false), p_order ->> 'notes', v_discount,
          v_gst, coalesce(p_order ->> 'created_via', 'app'));

  insert into public.order_items (id, shop_id, order_id, garment_type_id, qty, rate, styles, note,
                                  sort_order)
  select coalesce((e.v ->> 'id')::uuid, gen_random_uuid()), shop, v_id,
         (e.v ->> 'garment_type_id')::uuid, (e.v ->> 'qty')::smallint, (e.v ->> 'rate')::integer,
         coalesce(e.v -> 'styles', '{}'::jsonb), e.v ->> 'note', (e.ord - 1)::smallint
  from jsonb_array_elements(p_items) with ordinality as e(v, ord);

  insert into public.order_extras (id, shop_id, order_id, label, amount)
  select coalesce((x ->> 'id')::uuid, gen_random_uuid()), shop, v_id, x ->> 'label',
         (x ->> 'amount')::integer
  from jsonb_array_elements(v_extras_list) as x;

  if v_advance > 0 then
    insert into public.payments (id, shop_id, order_id, amount, mode, paid_on)
    values (coalesce((p_advance ->> 'id')::uuid, gen_random_uuid()), shop, v_id, v_advance,
            coalesce((p_advance ->> 'mode')::public.payment_mode, 'cash'), today);
  end if;

  return jsonb_build_object('id', v_id, 'order_no', v_no, 'total', v_total, 'paid', v_advance,
                            'balance', v_total - v_advance);
end;
$$;

-- API.md 4.5 — one step forward (received→ready→delivered) or one step back (Undo).
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_on date default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
  v_on date := coalesce(p_on, public.shop_today());
  v_balance integer;
begin
  select * into o from public.orders where id = p_order_id and deleted_at is null for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if o.cancelled_at is not null then
    raise exception 'ORDER_CANCELLED' using errcode = 'P0001';
  end if;

  if o.status <> p_status then
    if (o.status::text || '>' || p_status::text) not in
       ('received>ready', 'ready>delivered', 'ready>received', 'delivered>ready') then
      raise exception 'INVALID_TRANSITION' using errcode = 'P0001',
        detail = o.status::text || ' → ' || p_status::text;
    end if;
    update public.orders
    set status = p_status,
        ready_on = case
          when p_status = 'received' then null
          when p_status = 'ready' and o.status = 'received' then v_on
          else ready_on end,
        delivered_on = case when p_status = 'delivered' then v_on else null end
    where id = p_order_id
    returning * into o;
  end if;

  select balance into v_balance from public.order_totals where order_id = p_order_id;
  return jsonb_build_object('id', o.id, 'status', o.status, 'ready_on', o.ready_on,
                            'delivered_on', o.delivered_on, 'balance', v_balance);
end;
$$;

-- API.md 5.6 — save the current measurement for a cloth; the previous values go to history.
-- p_values: {"<field_id>": 40.5, …}. Fields left out of p_values are soft-deleted.
create or replace function public.save_measurement(
  p_id uuid,
  p_customer_id uuid,
  p_garment_type_id uuid,
  p_notes text,
  p_values jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  shop uuid := public.current_shop_id();
  today date := public.shop_today();
  m public.measurements;
  v_id uuid;
  snapshot jsonb;
  version_saved boolean := false;
begin
  if shop is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' or p_values = '{}'::jsonb then
    raise exception 'NO_VALUES' using errcode = 'P0001';
  end if;

  perform 1 from public.customers
  where id = p_customer_id and shop_id = shop and deleted_at is null;
  if not found then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform 1 from public.garment_types
  where id = p_garment_type_id and shop_id = shop and deleted_at is null;
  if not found then
    raise exception 'GARMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_values) as k
    where not exists (
      select 1 from public.measurement_fields f
      where f.id::text = k and f.garment_type_id = p_garment_type_id and f.deleted_at is null)
  ) then
    raise exception 'FIELD_NOT_IN_CLOTH' using errcode = 'P0001';
  end if;

  select * into m from public.measurements
  where customer_id = p_customer_id and garment_type_id = p_garment_type_id and deleted_at is null
  for update;

  if found then
    select coalesce(jsonb_object_agg(field_id::text, value_in), '{}'::jsonb) into snapshot
    from public.measurement_values
    where measurement_id = m.id and deleted_at is null;
    insert into public.measurement_versions (shop_id, measurement_id, "values", notes, measured_on)
    values (shop, m.id, snapshot, m.notes, m.measured_on);
    version_saved := true;
    update public.measurements set notes = p_notes, measured_on = today where id = m.id;
    v_id := m.id;
  else
    insert into public.measurements (id, shop_id, customer_id, garment_type_id, notes, measured_on)
    values (coalesce(p_id, gen_random_uuid()), shop, p_customer_id, p_garment_type_id, p_notes,
            today)
    returning id into v_id;
  end if;

  insert into public.measurement_values (measurement_id, field_id, shop_id, value_in)
  select v_id, e.key::uuid, shop, (e.value #>> '{}')::numeric
  from jsonb_each(p_values) as e
  on conflict (measurement_id, field_id)
  do update set value_in = excluded.value_in, deleted_at = null;

  update public.measurement_values
  set deleted_at = now()
  where measurement_id = v_id and deleted_at is null and not (p_values ? field_id::text);

  return jsonb_build_object('id', v_id, 'version_saved', version_saved);
end;
$$;

-- Grants: internal helpers are never callable from the API; RPCs only for signed-in owners.
revoke execute on function public.add_default_garments(uuid) from public, anon, authenticated;
revoke execute on function public.add_sample_data(uuid) from public, anon, authenticated;

revoke execute on function public.shop_today() from public, anon;
revoke execute on function public.create_shop(text, text, text, public.app_language, boolean) from public, anon;
revoke execute on function public.claim_order_no() from public, anon;
revoke execute on function public.next_book_no() from public, anon;
revoke execute on function public.create_order(jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.set_order_status(uuid, public.order_status, date) from public, anon;
revoke execute on function public.save_measurement(uuid, uuid, uuid, text, jsonb) from public, anon;

grant execute on function public.shop_today() to authenticated;
grant execute on function public.create_shop(text, text, text, public.app_language, boolean) to authenticated;
grant execute on function public.claim_order_no() to authenticated;
grant execute on function public.next_book_no() to authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, date) to authenticated;
grant execute on function public.save_measurement(uuid, uuid, uuid, text, jsonb) to authenticated;
