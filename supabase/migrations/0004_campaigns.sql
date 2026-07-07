-- LUMENS OS · 0004 · Campañas + métricas diarias
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  platform campaign_platform not null,
  product_id uuid references products(id) on delete set null,
  status campaign_status not null default 'testing',
  daily_budget numeric(10,2),
  external_id text,                            -- ID en Meta/TikTok
  started_at date,
  paused_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_campaigns_platform on campaigns(platform);
create index idx_campaigns_status on campaigns(status);

create table campaign_metrics (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  date date not null,
  spend numeric(10,2) not null default 0,
  impressions integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  cpa numeric(10,2),
  roas numeric(6,2),
  ctr numeric(5,2),
  cpm numeric(10,2),
  frequency numeric(5,2),
  notes text,
  created_at timestamptz default now(),
  unique(campaign_id, date)
);

create index idx_metrics_date on campaign_metrics(date desc);
