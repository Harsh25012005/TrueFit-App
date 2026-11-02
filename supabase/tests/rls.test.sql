-- TESTING.md §3 R1–R5 + DATABASE.md §7: shop isolation, plan gating, server-only tables.
-- Run with `npm run test:db` (local) — everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Runs a statement as the current role and returns how many rows it touched.
create function pg_temp.affected(statement text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Two owners, each with a shop created through create_shop().
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@truefit.test', '{"full_name":"Owner A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@truefit.test', '{"full_name":"Owner B"}');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', uid, 'role', 'authenticated')::text, true)
$$;

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
set local role authenticated;
select public.create_shop('Shop B', 'Owner B', '9898123456', 'en', true);
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select public.create_shop('Shop A', 'Owner A', '9824000000', 'gu', false);

-- R1: A sees only A's rows.
select is((select count(*) from public.shops), 1::bigint, 'R1 owner sees only their shop');
select is((select count(*) from public.customers), 0::bigint, 'R1 cannot see other shop customers');
select is((select count(*) from public.orders), 0::bigint, 'R1 cannot see other shop orders');
select is((select count(*) from public.garment_types), 2::bigint, 'R1 sees only own cloth types');

-- R2: A cannot write rows into B's shop.
reset role;
select set_config('test.shop_b',
  (select id::text from public.shops where name = 'Shop B'), true);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select throws_ok(
  format($$ insert into public.customers (shop_id, name, phone)
            values (%L, 'Intruder', '9999999999') $$, current_setting('test.shop_b')),
  '42501', null, 'R2 insert with another shop_id is denied');
select is(
  pg_temp.affected(format($$ update public.customers set name = 'Hacked' where shop_id = %L $$,
                          current_setting('test.shop_b'))),
  0::bigint, 'R2 update of another shop rows touches nothing');

-- Hard delete is never allowed (soft delete only).
select throws_ok($$ delete from public.garment_types $$, '42501', null, 'DELETE is denied');

-- R5: subscriptions are server-written.
select throws_ok($$ update public.subscriptions set status = 'active' $$, '42501', null,
  'R5 client cannot update subscriptions');
select throws_ok(
  $$ insert into public.subscriptions (shop_id) select public.current_shop_id() $$, '42501', null,
  'R5 client cannot insert subscriptions');

-- Protected shop columns.
select throws_ok($$ update public.shops set next_order_no = 1 $$, '42501', null,
  'next_order_no is not client-editable');
select lives_ok($$ update public.shops set name = 'Shop A Tailors' $$,
  'other shop columns are editable');

-- Shops and profiles are only created by the server.
select throws_ok(
  $$ insert into public.shops (owner_id, name) values (auth.uid(), 'Second shop') $$,
  '42501', null, 'shops cannot be inserted directly');

-- Child rows must match their parent's shop (assert_same_shop).
reset role;
select set_config('test.b_customer',
  (select c.id::text from public.customers c join public.shops s on s.id = c.shop_id
   where s.name = 'Shop B' limit 1), true);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select throws_ok(
  format($$ insert into public.orders (shop_id, customer_id, order_no, due_date)
            values (public.current_shop_id(), %L, 5000, current_date) $$,
         current_setting('test.b_customer')),
  '42501', null, 'cannot attach another shop customer to my order');

-- R4: expired plan blocks new customers/orders but not payments/status.
insert into public.customers (shop_id, name, phone)
values (public.current_shop_id(), 'Kiran Patel', '9727000000');
reset role;
update public.subscriptions set status = 'expired'
where shop_id = (select id from public.shops where name = 'Shop A Tailors');
insert into public.orders (shop_id, customer_id, order_no, due_date)
select c.shop_id, c.id, 1, current_date from public.customers c where c.name = 'Kiran Patel';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select is(public.shop_can_write(), false, 'R4 expired plan cannot write');
select throws_ok(
  $$ insert into public.customers (shop_id, name, phone)
     values (public.current_shop_id(), 'New Person', '9727000001') $$,
  '42501', null, 'R4 expired plan blocks new customers');
select throws_ok(
  $$ insert into public.orders (shop_id, customer_id, order_no, due_date)
     select shop_id, id, 2, current_date from public.customers where name = 'Kiran Patel' $$,
  '42501', null, 'R4 expired plan blocks new orders');
select lives_ok(
  $$ insert into public.payments (shop_id, order_id, amount)
     select shop_id, id, 100 from public.orders where order_no = 1 $$,
  'R4 expired plan can still collect payments');
select lives_ok(
  $$ select public.set_order_status(id, 'ready') from public.orders where order_no = 1 $$,
  'R4 expired plan can still change order status');
reset role;

-- R3: anon sees nothing.
set local role anon;
select throws_ok($$ select count(*) from public.customers $$, '42501', null,
  'R3 anon cannot read customers');
reset role;

select * from finish();
rollback;
