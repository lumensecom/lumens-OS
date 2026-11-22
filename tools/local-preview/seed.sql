insert into auth.users (id, email)
values ('405cf1a3-65bb-4b7b-a94e-2e1337af7828', 'operaciones@lumens-demo.invalid');

update public.profiles set full_name = 'Operaciones LUMENS'
where id = '405cf1a3-65bb-4b7b-a94e-2e1337af7828';

select set_config(
  'request.jwt.claims',
  '{"sub":"405cf1a3-65bb-4b7b-a94e-2e1337af7828"}',
  true
);

with periods as (
  select (now() at time zone 'America/Bogota')::date - days as date
  from generate_series(0, 2) as days
)
insert into public.revenue_entries (date, gross_amount, orders_count, notes)
select date, 3475000, 32, 'Demostración local' from periods;

with periods as (
  select (now() at time zone 'America/Bogota')::date - days as date
  from generate_series(0, 2) as days
)
insert into public.expense_entries (date, category, amount, description)
select date, 'ads_meta', 1240000, 'Demostración local' from periods;

with campaign as (
  insert into public.campaigns (name, platform)
  values ('Campaña de demostración', 'meta') returning id
)
insert into public.campaign_metrics (campaign_id, date, spend, impressions, clicks, conversions)
select id, (now() at time zone 'America/Bogota')::date - 1, 385000, 39500, 1770, 17 from campaign;

do $$
declare
  opportunity uuid;
  evidence_ids uuid[];
  observed_date date := (now() at time zone 'America/Bogota')::date;
begin
  opportunity := public.tower_create_opportunity(
    'Lámpara modular · Demo', 'Ejemplo de validación comercial con números ficticios.', 'Colombia');
  perform public.tower_add_evidence(opportunity, 'https://lumens-demo.invalid/control',
    'Documentación de cumplimiento de prueba.', 'observado', observed_date);
  perform public.tower_add_evidence(opportunity, 'https://lumens-demo.invalid/proveedor',
    'Capacidad ficticia para el entorno de prueba.', 'observado', observed_date);
  perform public.tower_add_evidence(opportunity, 'https://lumens-demo.invalid/mercado',
    'Señal de demanda sintética para probar el flujo.', 'observado', observed_date);
  select array_agg(id order by source_url) into evidence_ids from public.tower_evidence
    where opportunity_id = opportunity;
  perform public.tower_request_review(
    opportunity, 1, 129900, 36000, 22500, 160, evidence_ids[1], evidence_ids[3], evidence_ids[2], true);
  perform public.tower_create_opportunity(
    'Soporte de escritorio · Demo', 'Registro de radar de ejemplo para la demostración.', 'Colombia');
end $$;

select public.tower_receive_shopify_order('gid://shopify/Order/900000001', now(), 3, 'COP', 259900);
select tower_private.run_routine('international-radar', null);
select tower_private.run_routine('ad-metrics', null);
select tower_private.run_routine('daily-profit', null);
select tower_private.run_routine('brief', null);

-- Only the local demo adds one visible routine per minute.
select cron.schedule('lumens-local-preview', '* * * * *', $sql$
  select tower_private.run_routine(
    case extract(minute from now())::integer % 3
      when 0 then 'brief'
      when 1 then 'ad-metrics'
      else 'daily-profit'
    end,
    date_trunc('minute', now())
  );
$sql$);
