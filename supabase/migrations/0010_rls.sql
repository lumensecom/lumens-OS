-- LUMENS OS · 0010 · Row Level Security para todas las tablas del negocio
-- Fase 1: cualquier usuario autenticado puede leer/insertar/actualizar.
-- Solo el owner puede eliminar. (Refinable por módulo en fase 2.)
do $$
declare
  t text;
  business_tables text[] := array[
    'revenue_entries', 'expense_entries',
    'campaigns', 'campaign_metrics',
    'products', 'product_references', 'product_price_history',
    'knowledge_categories', 'knowledge_articles', 'knowledge_resources',
    'research_products', 'research_references',
    'creatives',
    'orders', 'customers'
  ];
begin
  foreach t in array business_tables loop
    execute format('alter table %I enable row level security;', t);

    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t || '_read_all', t);

    execute format(
      'create policy %I on %I for insert to authenticated with check (true);',
      t || '_insert_all', t);

    execute format(
      'create policy %I on %I for update to authenticated using (true);',
      t || '_update_all', t);

    execute format(
      'create policy %I on %I for delete to authenticated using (public.is_owner());',
      t || '_delete_owner', t);
  end loop;
end $$;
