-- DATABASE.md §8 — LOCAL DEVELOPMENT ONLY (`npm run db:reset`). Never run on a cloud project.
-- Login: owner@truefit.test / Test@1234
--
-- Builds the shop through create_shop(..., p_with_sample => true) so the seed follows the same
-- path as the app: profile (gu), Vaghela Tailors, trial, Shirt + Pant with fields, customers
-- Amit 101 / Priya 102 / Rahul 103, their measurements and orders #1001–#1003.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'owner@truefit.test',
  extensions.crypt('Test@1234', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Harsh Vaghela"}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"owner@truefit.test","email_verified":true}',
  'email', now(), now(), now()
);

-- Act as the owner so create_shop() sees auth.uid().
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
select public.create_shop('Vaghela Tailors', 'Harsh Vaghela', '9824000000', 'gu', true);
select set_config('request.jwt.claims', '', false);

update public.shops set weekly_off_day = 0
where owner_id = '00000000-0000-0000-0000-000000000001';
