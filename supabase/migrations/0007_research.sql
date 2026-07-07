-- LUMENS OS · 0007 · Research de productos
create table research_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  status text default 'candidate',             -- 'candidate', 'testing', 'winner', 'rejected'

  -- Los 5 criterios LUMENS (0-10 cada uno)
  score_margin integer check (score_margin between 0 and 10),
  score_demand integer check (score_demand between 0 and 10),
  score_visual integer check (score_visual between 0 and 10),
  score_logistics integer check (score_logistics between 0 and 10),
  score_competition integer check (score_competition between 0 and 10),
  total_score integer generated always as (
    coalesce(score_margin,0) + coalesce(score_demand,0) +
    coalesce(score_visual,0) + coalesce(score_logistics,0) +
    coalesce(score_competition,0)
  ) stored,

  -- Datos económicos
  estimated_selling_price numeric(10,2),
  estimated_cost numeric(10,2),
  estimated_margin numeric(10,2),

  -- Descubrimiento
  source_platform text,                        -- 'meta_ads_library', 'tiktok', 'aliexpress', 'amazon'
  source_url text,
  discovered_at timestamptz default now(),

  -- Contenido
  main_image_url text,
  gallery jsonb default '[]'::jsonb,
  hooks_ideas text[],
  target_audience text,
  notes text,

  created_by uuid references profiles(id),
  updated_at timestamptz default now()
);

create index idx_research_status on research_products(status);
create index idx_research_score on research_products(total_score desc);

create table research_references (
  id uuid primary key default uuid_generate_v4(),
  research_product_id uuid references research_products(id) on delete cascade,
  ref_type text not null,                      -- 'ad', 'store', 'video', 'article'
  url text not null,
  screenshot_url text,
  platform text,                               -- 'meta', 'tiktok', 'youtube', 'shopify'
  days_active integer,
  engagement_notes text,
  notes text,
  created_at timestamptz default now()
);

create index idx_research_refs_product on research_references(research_product_id);
