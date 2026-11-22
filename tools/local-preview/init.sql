-- Minimal Supabase-compatible schemas for the isolated demo database.
create role anon;
create role authenticated;
create role service_role bypassrls;
create role lumens_authenticator login noinherit;
grant anon, authenticated to lumens_authenticator;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;
grant usage on schema auth to authenticated;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key, bucket_id text);
alter table storage.objects enable row level security;

-- The application migrations narrow privileges for the tower.
alter default privileges grant select, insert, update, delete on tables to authenticated, service_role;
