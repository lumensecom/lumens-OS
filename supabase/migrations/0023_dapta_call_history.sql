-- The earlier Llamadas UI could use a manually provisioned table.
create table if not exists public.call_results (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  phone text,
  customer_name text,
  outcome text,
  success boolean,
  summary text,
  duration_seconds integer,
  agent_id text,
  raw jsonb,
  called_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.call_results
  add column if not exists provider_call_id text,
  add column if not exists requested boolean not null default false;
create unique index if not exists call_results_provider_call_uidx on public.call_results (provider_call_id);
create unique index if not exists call_results_active_order_uidx on public.call_results (order_id)
  where requested and outcome in ('despachando', 'en_cola', 'revisar', 'confirmado', 'cancelado');
create index if not exists call_results_recent_idx on public.call_results (called_at desc);

alter table public.call_results enable row level security;
revoke all on table public.call_results from public, anon, authenticated;
grant select on table public.call_results to authenticated;
grant select, insert, update on table public.call_results to service_role;
drop policy if exists call_results_owner_guard on public.call_results;
drop policy if exists call_results_owner_read on public.call_results;
create policy call_results_owner_guard on public.call_results as restrictive for select to authenticated
  using ((select public.is_owner()));
create policy call_results_owner_read on public.call_results for select to authenticated
  using ((select public.is_owner()));
