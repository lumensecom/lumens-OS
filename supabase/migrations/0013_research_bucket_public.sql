-- LUMENS OS · 0013 · El bucket research pasa a público.
-- Guarda screenshots de anuncios/tiendas públicas; servirlos por URL pública
-- simplifica el grid y el kanban (sin signed URLs por imagen).
update storage.buckets set public = true where id = 'research';
