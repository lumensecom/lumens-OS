-- LUMENS OS · 0002 · Perfiles de usuario + auth trigger
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role user_role not null default 'collaborator',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

-- Helper SECURITY DEFINER: evita recursión infinita en las políticas RLS de profiles.
-- (Consultar `profiles` dentro de una política de `profiles` recursa; con SECURITY
--  DEFINER la función se salta RLS y rompe el ciclo.)
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- El owner ve todos los perfiles; cualquier usuario ve el suyo.
create policy "owner_sees_all_profiles" on profiles
  for select to authenticated using (public.is_owner());

create policy "user_sees_own_profile" on profiles
  for select to authenticated using (id = auth.uid());

create policy "user_updates_own_profile" on profiles
  for update to authenticated using (id = auth.uid());

-- Crea el profile automáticamente al registrarse un usuario.
-- El primer usuario del sistema queda como 'owner'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when (select count(*) from public.profiles) = 0 then 'owner'::user_role
         else 'collaborator'::user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
