-- LUMENS OS · 0012 · Buckets de Storage + políticas
-- products y avatars son públicos (lectura por URL pública);
-- creatives, research y knowledge son privados (lectura vía signed URL).
insert into storage.buckets (id, name, public) values
  ('products', 'products', true),
  ('creatives', 'creatives', false),
  ('research', 'research', false),
  ('knowledge', 'knowledge', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Fase 1: cualquier usuario autenticado gestiona objetos de los buckets LUMENS.
create policy "lumens_objects_select" on storage.objects
  for select to authenticated
  using (bucket_id in ('products','creatives','research','knowledge','avatars'));

create policy "lumens_objects_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('products','creatives','research','knowledge','avatars'));

create policy "lumens_objects_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('products','creatives','research','knowledge','avatars'));

create policy "lumens_objects_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('products','creatives','research','knowledge','avatars'));
