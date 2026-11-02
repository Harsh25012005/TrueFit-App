-- DATABASE.md §1 / §9.1 — extensions and enum types.

create extension if not exists pgcrypto with schema extensions;

create type public.app_language as enum ('en', 'gu', 'hi');
create type public.measurement_unit as enum ('in', 'cm');
create type public.order_status as enum ('received', 'ready', 'delivered');
create type public.payment_mode as enum ('cash', 'upi', 'card');
create type public.plan_code as enum ('trial', 'pro_monthly', 'pro_yearly');
create type public.plan_status as enum ('trialing', 'active', 'grace', 'expired', 'cancelled');
-- V2 enums (DATABASE.md lists them with the MVP types; tables arrive in 0010/0011).
create type public.staff_pay_type as enum ('piece', 'monthly');
create type public.reminder_kind as enum ('pickup', 'payment', 'delay');
