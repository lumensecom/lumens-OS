-- Apply the WhatsApp schema to PostgreSQL volumes created by older local ZIPs.
select pg_advisory_xact_lock(172714, 21);
select to_regclass('public.tower_juliana_orders') is null as needs_juliana \gset
\if :needs_juliana
  \i /preview/0021_tower_juliana_whatsapp.sql
\endif

select public.tower_receive_juliana_order(
  'gid://shopify/Order/900000002', now(), 3, 'COP', 169900,
  '{"number":"9002","name":"Cliente demo","phone":"+573000000000","city":"MEDELLÍN","priority":true,"total":169900,"products":[{"title":"Vestido Pádel | Lumens","quantity":3}]}'::jsonb
);
