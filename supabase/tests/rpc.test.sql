-- TESTING.md §3 O2, O3, G1, ME3/ME4, OR1, OR5, SP1 + LWW guard: every RPC's success and failure.
-- Run with `npm run test:db` (local) — everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000000a', 'a@truefit.test', '{"full_name":"Owner A"}');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

-- O2: create_shop builds shop + trial + Shirt/Pant with fields.
select is(
  (public.create_shop('Vaghela Tailors', 'Harsh Vaghela', '9824000000', 'gu', false)) ->> 'name',
  'Vaghela Tailors', 'O2 create_shop returns the shop');
select is((select full_name from public.profiles), 'Harsh Vaghela', 'O2 profile name saved');
select is((select language::text from public.profiles), 'gu', 'O2 profile language saved');
select is((select status::text from public.subscriptions), 'trialing', 'O2 trial started');
select ok(
  (select trial_ends_at between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour'
   from public.subscriptions), 'O2 trial ends in 30 days');
select results_eq(
  $$ select name from public.garment_types order by sort_order $$,
  array['Shirt', 'Pant'], 'O2 Shirt and Pant exist');
select is((select count(*) from public.measurement_fields), 14::bigint, 'O2 7 fields each');

-- O3: second call conflicts.
select throws_ok($$ select public.create_shop('Again', 'Harsh Vaghela') $$, '23505', 'SHOP_EXISTS',
  'O3 create_shop twice → 23505');

-- G1: duplicate cloth name (case-insensitive) rejected.
select throws_ok(
  $$ insert into public.garment_types (shop_id, name) values (public.current_shop_id(), 'shirt') $$,
  '23505', null, 'G1 duplicate cloth name rejected');

-- next_book_no / claim_order_no
insert into public.customers (id, shop_id, name, phone, book_no) values
  ('00000000-0000-0000-0000-0000000000c1', public.current_shop_id(), 'Amit Shah', '9824012345', '101'),
  ('00000000-0000-0000-0000-0000000000c2', public.current_shop_id(), 'Priya Desai', '9898123456', 'A-7');
select is(public.next_book_no(), '102', 'next_book_no = max numeric + 1, ignores non-numeric');
select is(public.claim_order_no(), 1001, 'claim_order_no returns the next number');
select is(public.claim_order_no(), 1002, 'claim_order_no increments');

-- save_measurement: first save, then an edit creates a version (ME3).
select set_config('test.shirt', (select id::text from public.garment_types where name = 'Shirt'), true);
select set_config('test.chest', (select id::text from public.measurement_fields
  where garment_type_id = current_setting('test.shirt')::uuid and name = 'Chest'), true);
select is(
  (public.save_measurement(null, '00000000-0000-0000-0000-0000000000c1',
     current_setting('test.shirt')::uuid, null,
     jsonb_build_object(current_setting('test.chest'), 40))) ->> 'version_saved',
  'false', 'first measurement has no history');
select is(
  (public.save_measurement(null, '00000000-0000-0000-0000-0000000000c1',
     current_setting('test.shirt')::uuid, 'Loose at chest',
     jsonb_build_object(current_setting('test.chest'), 40.5))) ->> 'version_saved',
  'true', 'ME3 edit snapshots the old values');
select is(
  (select ("values" ->> current_setting('test.chest'))::numeric from public.measurement_versions),
  40::numeric, 'ME3 version holds the previous value');
select is((select value_in from public.measurement_values where deleted_at is null), 40.50,
  'current value updated');
-- ME4: one current measurement per cloth.
select throws_ok(
  format($$ insert into public.measurements (shop_id, customer_id, garment_type_id)
            values (public.current_shop_id(), '00000000-0000-0000-0000-0000000000c1', %L) $$,
         current_setting('test.shirt')),
  '23505', null, 'ME4 second current measurement rejected');
select throws_ok(
  format($$ select public.save_measurement(null, '00000000-0000-0000-0000-0000000000c1', %L, null,
            '{"00000000-0000-0000-0000-000000000000": 10}') $$, current_setting('test.shirt')),
  'P0001', 'FIELD_NOT_IN_CLOTH', 'fields must belong to the cloth');

-- create_order: blocked without measurement, advance check, totals (OR1, OR5).
select set_config('test.pant', (select id::text from public.garment_types where name = 'Pant'), true);
select throws_ok(
  format($$ select public.create_order(
      '{"customer_id":"00000000-0000-0000-0000-0000000000c2","due_date":"2099-01-01"}',
      jsonb_build_array(jsonb_build_object('garment_type_id', %L, 'qty', 1, 'rate', 500))) $$,
    current_setting('test.shirt')),
  'P0001', 'MEASUREMENT_MISSING', 'OR3 order blocked without measurement');
select throws_ok(
  format($$ select public.create_order(
      '{"customer_id":"00000000-0000-0000-0000-0000000000c1","due_date":"2099-01-01"}',
      jsonb_build_array(jsonb_build_object('garment_type_id', %L, 'qty', 1, 'rate', 500)),
      '[]', '{"amount": 501}') $$,
    current_setting('test.shirt')),
  'P0001', 'ADVANCE_EXCEEDS_TOTAL', 'OR5 advance greater than total rejected');

-- OR1: 2×650 + extra 150 − 50, GST 5 % → base 1400, tax 70, total 1470 (shirt only: has measurement)
select is(
  public.create_order(
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000000d1',
      'customer_id', '00000000-0000-0000-0000-0000000000c1', 'due_date', '2099-01-01',
      'discount', 50, 'gst_rate', 5),
    jsonb_build_array(jsonb_build_object('garment_type_id', current_setting('test.shirt'),
      'qty', 2, 'rate', 650)),
    '[{"label":"Lining","amount":150}]', '{"amount":1000,"mode":"upi"}')
  - 'id',
  '{"order_no":1003,"total":1470,"paid":1000,"balance":470}'::jsonb,
  'OR1 create_order totals and order number');
select is(
  (select total from public.order_totals where order_id = '00000000-0000-0000-0000-0000000000d1'),
  1470, 'order_totals view matches create_order');
select is(
  (public.create_order(
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000000d1',
      'customer_id', '00000000-0000-0000-0000-0000000000c1', 'due_date', '2099-01-01'),
    '[{"garment_type_id":"00000000-0000-0000-0000-000000000000","qty":1,"rate":1}]')) ->> 'order_no',
  '1003', 'create_order is idempotent on the order id');

-- set_order_status (SP1 + one step at a time + undo).
select throws_ok(
  $$ select public.set_order_status('00000000-0000-0000-0000-0000000000d1', 'delivered') $$,
  'P0001', 'INVALID_TRANSITION', 'SP1 received → delivered rejected');
select is(
  (public.set_order_status('00000000-0000-0000-0000-0000000000d1', 'ready')) ->> 'status',
  'ready', 'received → ready');
select is(
  (public.set_order_status('00000000-0000-0000-0000-0000000000d1', 'delivered', '2026-11-02'))
    ->> 'delivered_on',
  '2026-11-02', 'ready → delivered sets delivered_on');

-- Last-write-wins guard: a stale push leaves the newer row untouched.
update public.customers set name = 'Amit Shah (old phone)', updated_at = '2000-01-01'
where id = '00000000-0000-0000-0000-0000000000c1';
select is((select name from public.customers where id = '00000000-0000-0000-0000-0000000000c1'),
  'Amit Shah', 'LWW stale update skipped');

select * from finish();
rollback;
