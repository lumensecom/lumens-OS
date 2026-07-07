-- LUMENS OS · 0006 · Base de conocimiento
create table knowledge_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  icon text,                                   -- lucide icon name
  color text,                                  -- hex color
  order_index integer default 0,
  created_at timestamptz default now()
);

create table knowledge_articles (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references knowledge_categories(id) on delete cascade,
  title text not null,
  slug text unique not null,
  content text,                                -- Markdown
  cover_image_url text,
  tags text[] default '{}',
  order_index integer default 0,
  is_pinned boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_articles_category on knowledge_articles(category_id);
create index idx_articles_tags on knowledge_articles using gin(tags);

-- Full-text search (español)
create index idx_articles_content_search on knowledge_articles
  using gin(to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(content,'')));

create table knowledge_resources (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid references knowledge_articles(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,                              -- 'pdf', 'video', 'template'
  size_bytes integer,
  created_at timestamptz default now()
);
