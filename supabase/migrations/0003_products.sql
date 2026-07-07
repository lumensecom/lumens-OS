-- LUMENS OS · 0003 · Productos (+ referencias, historial de precios, vista de margen)
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  status product_status not null default 'testing',

  -- Precios
  selling_price numeric(10,2) not null,
  compared_price numeric(10,2),                -- precio tachado
  cost_dropi numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,

  -- Metadata
  landing_url text,
  shopify_product_id text,
  dropi_product_id text,

  -- Contenido
  description text,
  main_image_url text,
  gallery jsonb default '[]'::jsonb,           -- array de URLs

  -- Ángulos y referencias
  best_angle text,
  target_audience text,

  -- Performance
  best_cpa numeric(10,2),
  best_roas numeric(6,2),
  total_orders integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_status on products(status);
create index idx_products_slug on products(slug);

-- Cálculo automático de margen (vista con security_invoker para respetar RLS).
create view products_with_margin
with (security_invoker = on) as
select
  *,
  (selling_price - cost_dropi - shipping_cost) as margin,
  case when selling_price > 0
    then ((selling_price - cost_dropi - shipping_cost) / selling_price * 100)
    else 0 end as margin_percentage,
  (selling_price - cost_dropi - shipping_cost) as cpa_max_rentable
from products;

-- Referencias de tiendas/anuncios competidores
create table product_references (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  ref_type text not null,                      -- 'store', 'ad', 'video'
  url text not null,
  screenshot_url text,
  title text,
  notes text,
  created_at timestamptz default now()
);

-- Historial de cambios de precio
create table product_price_history (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  selling_price numeric(10,2),
  cost_dropi numeric(10,2),
  changed_at timestamptz default now(),
  changed_by uuid references profiles(id),
  reason text
);
