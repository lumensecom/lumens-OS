-- LUMENS OS · 0005 · Contabilidad (ingresos y gastos)
-- Nota: va después de products y campaigns porque las referencia.
create table revenue_entries (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  source revenue_source not null default 'shopify',
  product_id uuid references products(id) on delete set null,
  gross_amount numeric(12,2) not null,
  orders_count integer not null default 1,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_revenue_date on revenue_entries(date desc);
create index idx_revenue_product on revenue_entries(product_id);

create table expense_entries (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  category expense_category not null,
  amount numeric(12,2) not null,
  product_id uuid references products(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_expense_date on expense_entries(date desc);
create index idx_expense_category on expense_entries(category);
