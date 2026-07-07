-- LUMENS OS · 0008 · Creativos (anuncios)
create table creatives (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                          -- ej: "C3 - Mi novio no es el típico"
  product_id uuid references products(id) on delete cascade,
  platform angle_platform not null,
  status creative_status not null default 'testing',

  -- Contenido
  video_url text,
  thumbnail_url text,
  duration_seconds integer,

  -- Estructura
  hook text,                                   -- primeros 3 segundos
  script text,                                 -- guion completo
  cta text,
  music_ref text,                              -- "Ed Sheeran - Perfect"

  -- Métricas acumuladas (denormalizadas para velocidad)
  total_spend numeric(10,2) default 0,
  total_conversions integer default 0,
  best_cpa numeric(10,2),
  best_roas numeric(6,2),
  best_ctr numeric(5,2),

  angle_type text,                             -- 'hombre_regalando', 'dolor_directo', etc
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_creatives_product on creatives(product_id);
create index idx_creatives_status on creatives(status);
create index idx_creatives_angle on creatives(angle_type);
