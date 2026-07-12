-- LUMENS OS · 0014 · Costeo completo (espejo del Excel) + tabla settings

-- Columnas nuevas de costeo por producto
alter table products
  add column if not exists fulfillment_cost numeric(10,2) not null default 0,
  add column if not exists cpa_real numeric(10,2),
  add column if not exists admin_cost numeric(10,2) not null default 2000,
  add column if not exists price_rule_pct numeric(5,2) not null default 50;

comment on column products.fulfillment_cost is 'Costo de fulfillment por unidad (COP)';
comment on column products.cpa_real is 'CPA de publicidad real/estimado (columna PUBLICIDAD del Excel)';
comment on column products.admin_cost is 'Costo administrativo unitario (COP)';
comment on column products.price_rule_pct is 'Regla de precio: % máximo de COGS sobre el precio de venta (50 = COGS debe ser ≤50% del precio)';

-- Vista de margen recalculada con el costeo completo
drop view if exists products_with_margin;
create view products_with_margin
with (security_invoker = on) as
select
  *,
  (cost_dropi + fulfillment_cost + shipping_cost) as cogs,
  (selling_price - cost_dropi - fulfillment_cost - shipping_cost) as margin,
  case when selling_price > 0
    then ((selling_price - cost_dropi - fulfillment_cost - shipping_cost) / selling_price * 100)
    else 0 end as margin_percentage,
  (selling_price - cost_dropi - fulfillment_cost - shipping_cost) as cpa_max_rentable,
  (selling_price - cost_dropi - fulfillment_cost - shipping_cost
    - coalesce(cpa_real, 0) - admin_cost) as net_utility,
  case when selling_price > 0
    then ((selling_price - cost_dropi - fulfillment_cost - shipping_cost
      - coalesce(cpa_real, 0) - admin_cost) / selling_price * 100)
    else 0 end as net_utility_percentage,
  case when price_rule_pct > 0
    then round((cost_dropi + fulfillment_cost + shipping_cost) / (price_rule_pct / 100), 0)
    else null end as min_selling_price
from products;

-- Configuración global de la app (una sola fila)
create table settings (
  id smallint primary key default 1 check (id = 1),
  meta_a numeric(12,2) not null default 4000000,
  meta_b numeric(12,2) not null default 7000000,
  default_shipping_cost numeric(10,2) not null default 18000,
  default_admin_cost numeric(10,2) not null default 2000,
  default_price_rule_pct numeric(5,2) not null default 50,
  ai_brand_context text,
  updated_at timestamptz default now()
);

insert into settings (id) values (1);

alter table settings enable row level security;
create policy "settings_select" on settings
  for select to authenticated using (true);
create policy "settings_update" on settings
  for update to authenticated using (true) with check (true);
create policy "settings_insert" on settings
  for insert to authenticated with check (public.is_owner());
create policy "settings_delete" on settings
  for delete to authenticated using (public.is_owner());
