-- DealKart x YouPI-PG payment add-on.
-- Run this in the Supabase SQL Editor after your existing SUPABASE_SETUP.sql.
-- These tables are server-only: do not add anon/authenticated access policies.

create table if not exists public.orders (
  id text primary key,
  customer_details jsonb not null,
  items jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  coupon_code text,
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  pay_now_amount numeric(12,2) not null check (pay_now_amount > 0),
  due_on_delivery numeric(12,2) not null default 0 check (due_on_delivery >= 0),
  payment_mode text not null check (payment_mode in ('full','partial')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','expired','cancelled')),
  gateway_provider text not null default 'youpi',
  gateway_payment_id text,
  gateway_checkout_url text,
  gateway_utr text,
  currency text not null default 'INR',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status, created_at desc);
create unique index if not exists orders_gateway_payment_id_unique
  on public.orders (gateway_payment_id) where gateway_payment_id is not null;

create table if not exists public.payment_webhook_events (
  delivery_id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  event_name text not null check (event_name in ('SUCCESS','FAILED','EXPIRED','CANCELLED')),
  received_at timestamptz not null default now()
);
create index if not exists payment_webhook_events_order_idx
  on public.payment_webhook_events (order_id, received_at desc);

alter table public.orders enable row level security;
alter table public.payment_webhook_events enable row level security;
-- Intentionally no browser-facing RLS policies. Access these tables only through
-- server endpoints using SUPABASE_SERVICE_ROLE_KEY stored in server environment variables.
