-- LUMENS OS · 0009 · Pedidos y clientes (Fase 2 — tablas listas para el futuro)
create table orders (
  id uuid primary key default uuid_generate_v4(),
  dropi_order_id text unique,
  shopify_order_id text,

  -- Cliente
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  customer_city text,
  customer_department text,

  -- Producto
  product_id uuid references products(id),
  quantity integer default 1,
  unit_price numeric(10,2),
  total_amount numeric(10,2),

  -- Estado
  status text default 'pending',               -- pending, confirmed, shipped, delivered, returned, cancelled
  dropi_status text,

  -- Fechas
  ordered_at timestamptz,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,

  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_orders_status on orders(status);
create index idx_orders_customer_phone on orders(customer_phone);
create index idx_orders_dropi on orders(dropi_order_id);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  name text,
  email text,
  city text,
  department text,

  -- Historial agregado
  total_orders integer default 0,
  total_delivered integer default 0,
  total_returned integer default 0,
  total_spent numeric(12,2) default 0,

  -- Score de riesgo (calculado)
  risk_score numeric(3,2) default 0,           -- 0.0 a 1.0
  is_blacklisted boolean default false,

  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_customers_phone on customers(phone);
create index idx_customers_risk on customers(risk_score desc);
