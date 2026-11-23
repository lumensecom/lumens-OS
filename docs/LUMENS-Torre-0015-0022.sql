-- LUMENS OS · Instalación de la torre desde Supabase SQL Editor
-- Para un proyecto con el panel base de LUMENS y sin el esquema de la torre.
-- Las operaciones se ejecutan en una sola transacción.
-- SQL Editor no registra estas versiones en el historial de la CLI.

begin;

do $preflight$
begin
  if to_regclass('public.tower_agents') is not null
    or to_regclass('public.tower_routines') is not null
    or to_regnamespace('tower_private') is not null then
    raise exception 'Este proyecto ya tiene parte del esquema de la torre. Revisa las migraciones aplicadas antes de continuar.';
  end if;
  if to_regclass('auth.users') is null
    or to_regclass('public.profiles') is null
    or to_regclass('public.orders') is null
    or to_regclass('public.campaign_metrics') is null
    or to_regclass('public.revenue_entries') is null
    or to_regclass('public.expense_entries') is null
    or to_regprocedure('public.is_owner()') is null then
    raise exception 'Aquí faltan tablas del panel base de LUMENS. Confirma que seleccionaste el proyecto de Supabase correcto.';
  end if;
end;
$preflight$;

-- 0015_agent_tower.sql
-- The existing profile role is authoritative for Tower access.
create function public.tower_protect_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') then
    raise insufficient_privilege using message = 'Profile role is managed by an administrator';
  end if;
  return new;
end;
$$;
revoke all on function public.tower_protect_profile_role() from public;
create trigger tower_protect_profile_role before update of role on public.profiles
for each row execute function public.tower_protect_profile_role();

create table public.tower_agents (
  code text primary key,
  floor text not null,
  name text not null,
  mission text not null
);

create table public.tower_routines (
  code text primary key,
  agent_code text not null references public.tower_agents(code),
  name text not null,
  cadence text not null check (cadence in ('scheduled', 'manual', 'event')),
  local_minutes integer[] not null default '{}',
  weekdays integer[] not null default '{0,1,2,3,4,5,6}',
  time_note text,
  enabled boolean not null default true,
  enabled_since timestamptz not null default now(),
  check ((cadence = 'scheduled') = (cardinality(local_minutes) > 0)),
  check (0 <= all(local_minutes) and 1439 >= all(local_minutes)),
  check (weekdays <@ array[0,1,2,3,4,5,6])
);

create table public.tower_runs (
  id uuid primary key default gen_random_uuid(),
  routine_code text not null references public.tower_routines(code),
  scheduled_for timestamptz,
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'blocked', 'error')),
  output jsonb not null default '{}',
  unique (routine_code, scheduled_for)
);
create index tower_runs_routine_latest_idx on public.tower_runs (routine_code, started_at desc);

create table public.tower_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  problem text not null check (char_length(problem) between 1 and 1500),
  country text not null check (char_length(country) between 2 and 60),
  stage text not null default 'detectada'
    check (stage in ('detectada', 'en_validacion', 'pendiente_aprobacion', 'aprobada', 'descartada')),
  assessment jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.tower_evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.tower_opportunities(id),
  source_url text not null check (source_url ~ '^https?://[^[:space:]]+$' and char_length(source_url) <= 2048),
  observation text not null check (char_length(observation) between 1 and 1500),
  kind text not null check (kind in ('observado', 'estimado', 'hipotesis')),
  captured_on date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (opportunity_id, source_url, observation)
);

create table public.tower_approvals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.tower_opportunities(id),
  kind text not null check (kind in ('opportunity', 'landing', 'campaign_publish', 'budget_change', 'price_change', 'contact')),
  title text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  comment text,
  check ((status = 'pending') = (decided_at is null and decided_by is null))
);
create unique index tower_pending_approval_idx on public.tower_approvals (opportunity_id, kind) where status = 'pending';

create table public.tower_alerts (
  code text primary key,
  routine_code text not null references public.tower_routines(code),
  severity text not null check (severity in ('critical', 'warning')),
  message text not null,
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.tower_stage_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.tower_opportunities(id),
  stage text not null,
  author_id uuid not null references auth.users(id),
  comment text,
  recorded_at timestamptz not null default now()
);

do $$
declare target text;
begin
  foreach target in array array[
    'tower_agents','tower_routines','tower_runs','tower_opportunities','tower_evidence',
    'tower_approvals','tower_alerts','tower_stage_history'
  ] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on public.%I from public, anon, authenticated', target);
    execute format('grant select on public.%I to authenticated', target);
    execute format('create policy tower_owner_read on public.%I for select to authenticated using ((select public.is_owner()))', target);
  end loop;
end $$;

insert into public.tower_agents (code, name, floor, mission) values
  ('0', 'Dirección de operaciones', 'PH', 'Consolida el brief, coordina las decisiones y hace seguimiento a las alertas.'),
  ('7A', 'Analítica de pauta', '7', 'Revisa gasto y conversiones para proponer acciones de campaña con evidencia.'),
  ('7B', 'Utilidad real', '7', 'Cruza pedidos, entregas, devoluciones y costos para calcular la utilidad.'),
  ('6A', 'Confirmación de pedidos', '6', 'Confirma dirección y disposición a pagar antes de generar un despacho.'),
  ('6B', 'Novedades y logística', '6', 'Gestiona novedades y pedidos pendientes de recoger para recuperar entregas.'),
  ('6C', 'Reseñas reales', '6', 'Solicita reseñas a compradores con pedidos entregados y registra su permiso.'),
  ('5A', 'Borradores de campaña', '5', 'Arma borradores publicitarios para la revisión de Juan.'),
  ('5B', 'QA de lanzamiento', '5', 'Verifica la landing, Releasit, el píxel y la configuración final del borrador.'),
  ('4A', 'Estrategia creativa', '4', 'Propone guiones, ganchos y textos de campaña con base en señales verificables.'),
  ('4B', 'Prompts visuales', '4', 'Prepara instrucciones visuales ligadas a la referencia real del producto.'),
  ('3A', 'Oferta y precio', '3', 'Diseña el pack destacado y las alternativas con margen comprobable.'),
  ('3B', 'Landing Shopify', '3', 'Adapta las plantillas Liquid validadas y verifica su conexión con Releasit.'),
  ('2A', 'Validador de demanda', '2', 'Puntúa la demanda local y documenta la evidencia detrás de cada criterio.'),
  ('2B', 'Rentabilidad y proveedor', '2', 'Verifica margen por pack, fletes y disponibilidad por variante.'),
  ('2C', 'Cumplimiento', '2', 'Revisa el producto, las promesas y la autorización de los materiales.'),
  ('1A', 'Radar internacional', '1', 'Detecta problemas cotidianos con evidencia en mercados internacionales.'),
  ('1B', 'Radar Colombia', '1', 'Identifica demanda y saturación en Colombia a partir de evidencia por proveedor.'),
  ('1C', 'Radar de tendencias', '1', 'Anticipa temporadas comerciales y propone candidatos para el radar local.');

insert into public.tower_routines (agent_code, code, name, cadence, local_minutes, weekdays, time_note, enabled) values
  ('0', 'brief', 'Brief de la mañana', 'scheduled', array[450], array[0,1,2,3,4,5,6], null, true),
  ('0', 'close', 'Cierre del día', 'scheduled', array[1080], array[0,1,2,3,4,5,6], null, true),
  ('0', 'weekly-plan', 'Plan de la semana', 'scheduled', array[480], array[1], null, true),
  ('0', 'critical-alerts', 'Escalamiento de alertas críticas', 'event', '{}', array[0,1,2,3,4,5,6], null, true),
  ('7A', 'ad-metrics', 'Revisión de métricas publicitarias', 'scheduled', array[405], array[0,1,2,3,4,5,6], null, true),
  ('7A', 'ads-alerts', 'Alertas de pauta, cuenta y píxel', 'event', '{}', array[0,1,2,3,4,5,6], null, true),
  ('7B', 'daily-profit', 'Utilidad diaria', 'scheduled', array[435], array[0,1,2,3,4,5,6], null, true),
  ('7B', 'weekly-profit', 'Cierre semanal de utilidad', 'scheduled', array[1200], array[0], null, true),
  ('6A', 'new-order', 'Pedido nuevo de Shopify', 'event', '{}', array[0,1,2,3,4,5,6], null, true),
  ('6B', 'delivery-check', 'Revisión de novedades y oficina', 'scheduled', array[540,900], array[0,1,2,3,4,5,6], null, true),
  ('6C', 'reviews', 'Solicitud de reseñas a entregados', 'scheduled', array[600], array[0,1,2,3,4,5,6], null, false),
  ('5A', 'draft-campaign', 'Preparación de campaña', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('5B', 'launch-qa', 'Validación previa al lanzamiento', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('4A', 'creative-brief', 'Guiones para oportunidad aprobada', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('4A', 'refresh-creatives', 'Refresco de creativos', 'manual', '{}', array[0,1,2,3,4,5,6], 'Miércoles · Hora por definir', true),
  ('4B', 'visual-prompts', 'Preparación de prompts', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('3A', 'offer', 'Propuesta de oferta', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('3B', 'landing', 'Adaptación de la landing', 'manual', '{}', array[0,1,2,3,4,5,6], null, true),
  ('2A', 'validate-demand', 'Validación de demanda en lote', 'scheduled', array[420], array[0,1,2,3,4,5,6], null, true),
  ('2B', 'validate-economics', 'Validación económica en lote', 'scheduled', array[420], array[0,1,2,3,4,5,6], null, true),
  ('2B', 'critical-stock', 'Alerta de stock crítico', 'event', '{}', array[0,1,2,3,4,5,6], null, true),
  ('2C', 'validate-compliance', 'Validación de cumplimiento en lote', 'scheduled', array[420], array[0,1,2,3,4,5,6], null, true),
  ('2C', 'invima-alerts', 'Alerta nueva de INVIMA', 'event', '{}', array[0,1,2,3,4,5,6], null, true),
  ('1A', 'international-radar', 'Barrido internacional', 'scheduled', array[360], array[0,1,2,3,4,5,6], null, true),
  ('1B', 'local-radar', 'Barrido de Colombia', 'scheduled', array[375], array[0,1,2,3,4,5,6], null, true),
  ('1B', 'weekly-radar', 'Barrido amplio de proveedores', 'scheduled', array[360], array[1], null, true),
  ('1C', 'seasonal-radar', 'Revisión de temporadas', 'scheduled', array[360], array[1], null, true);

-- 0016_tower_automation.sql
create schema if not exists tower_private;
revoke all on schema tower_private from public, anon, authenticated;

create function tower_private.require_owner()
returns void language plpgsql stable set search_path = '' as $$
begin
  if not public.is_owner() then
    raise insufficient_privilege using message = 'Tower access requires the owner role';
  end if;
end;
$$;

create function tower_private.run_routine(target_code text, occurrence timestamptz)
returns text language plpgsql set search_path = '' as $$
declare
  run_id uuid;
  outcome text := 'success';
  result jsonb;
  routine public.tower_routines;
  local_day date := (coalesce(occurrence, now()) at time zone 'America/Bogota')::date;
  start_day date := local_day - 1;
  revenue numeric;
  expenses numeric;
  record_count integer;
begin
  select * into routine from public.tower_routines where code = target_code for update;
  if not found or not routine.enabled or routine.cadence = 'event'
    or (occurrence is not null and routine.enabled_since >= occurrence + interval '1 minute') then
    return 'inactive';
  end if;
  insert into public.tower_runs (routine_code, scheduled_for, status)
  values (target_code, occurrence, 'running') on conflict (routine_code, scheduled_for) do nothing
  returning id into run_id;
  if run_id is null then return 'duplicate'; end if;

  begin
    if target_code in ('brief', 'close', 'weekly-plan', 'daily-profit', 'weekly-profit') then
      if target_code = 'weekly-profit' then start_day := local_day - 6; end if;
      if target_code = 'weekly-plan' then start_day := local_day - 7; end if;
      if target_code in ('close', 'weekly-profit') then local_day := local_day + 1; end if;
      select sum(gross_amount) into revenue from public.revenue_entries
        where date >= start_day and date < local_day;
      select sum(amount) into expenses from public.expense_entries where date >= start_day and date < local_day;
      result := jsonb_build_object(
        'desde', start_day, 'hasta', local_day - 1, 'fuente', 'Contabilidad',
        'ingresos_registrados_cop', revenue, 'gastos_registrados_cop', expenses,
        'saldo_registrado_cop', revenue - expenses
      );
      if target_code in ('brief', 'close', 'weekly-plan') then
        result := result || jsonb_build_object(
          'aprobaciones_pendientes', (select count(*) from public.tower_approvals where status = 'pending'),
          'alertas_criticas', (select count(*) from public.tower_alerts where severity = 'critical' and resolved_at is null),
          'oportunidades_por_revisar', coalesce((
            select jsonb_agg(item.title order by item.created_at desc) from (
              select title, created_at from public.tower_opportunities
              where stage = 'pendiente_aprobacion' order by created_at desc limit 3
            ) item
          ), '[]'::jsonb)
        );
      elsif revenue is null or expenses is null then
        outcome := 'blocked';
        result := result || jsonb_build_object('motivo', 'Faltan ingresos o gastos registrados para el período.');
      end if;
    elsif target_code in ('ad-metrics', 'delivery-check') then
      if target_code = 'ad-metrics' then
        select count(*), jsonb_build_object(
          'fuente', 'Métricas registradas en Campañas', 'desde', local_day - 3, 'hasta', local_day - 1,
          'filas', count(*), 'gasto_registrado_cop', sum(spend), 'conversiones_registradas', sum(conversions),
          'cpa_ponderado_cop', round(sum(spend) / nullif(sum(conversions), 0))
        ) into record_count, result from public.campaign_metrics where date >= local_day - 3 and date < local_day;
      else
        select count(*), jsonb_build_object(
          'fuente', 'Pedidos sincronizados', 'filas', count(*),
          'en_novedad', count(*) filter (where lower(coalesce(status, '')) = 'novelty'
            or lower(coalesce(dropi_status, '')) in ('novedad', 'reclame en oficina'))
        ) into record_count, result from public.orders;
      end if;
      if record_count = 0 then
        outcome := 'blocked';
        result := result || jsonb_build_object('motivo', 'La fuente interna aún no tiene registros para esta rutina.');
      end if;
    elsif target_code in ('validate-demand', 'validate-economics', 'validate-compliance') then
      select jsonb_build_object(
        'fuente', 'Product Lab', 'en_validacion', count(*) filter (where stage = 'en_validacion'),
        'detectadas', count(*) filter (where stage = 'detectada'),
        'pendientes_de_aprobacion', count(*) filter (where stage = 'pendiente_aprobacion'),
        'motivo', 'La evaluación requiere evidencia y datos ingresados en Product Lab.'
      ) into result from public.tower_opportunities;
      outcome := 'blocked';
    else
      outcome := 'blocked';
      result := jsonb_build_object('motivo', case
        when target_code in ('international-radar','local-radar','weekly-radar','seasonal-radar') then 'Falta un conector de fuentes autorizado.'
        when target_code = 'reviews' then 'Faltan el flujo y la autorización de contacto.'
        else 'La rutina requiere un flujo o un expediente conectado.' end);
    end if;
  exception when others then
    outcome := 'error';
    result := jsonb_build_object('motivo', 'Falló la lectura de la rutina.', 'codigo', sqlstate);
  end;

  update public.tower_runs set status = outcome, output = result, finished_at = clock_timestamp()
  where id = run_id;

  -- Repeated failures update the same alert until a successful run resolves it.
  if outcome = 'error' then
    insert into public.tower_alerts (code, routine_code, severity, message)
    values (target_code, target_code, 'critical', 'Falló la rutina «' || routine.name || '».')
    on conflict (code) do update set resolved_at = null, updated_at = now(), message = excluded.message;
  elsif outcome = 'success' then
    update public.tower_alerts set resolved_at = now() where code = target_code and resolved_at is null;
  end if;
  return outcome;
end;
$$;

create function tower_private.tick(at_time timestamptz default now())
returns integer language plpgsql set search_path = '' as $$
declare
  due record;
  processed integer := 0;
begin
  if not pg_try_advisory_xact_lock(172714, 1) then return 0; end if;
  for due in
    select r.code, slots.minute
    from pg_catalog.generate_series(date_trunc('minute', at_time) - interval '10 minutes',
      date_trunc('minute', at_time), interval '1 minute') as slots(minute)
    cross join lateral (select slots.minute at time zone 'America/Bogota' as local_time) local
    join public.tower_routines r on r.enabled and r.cadence = 'scheduled'
      and r.enabled_since < slots.minute + interval '1 minute'
      and extract(dow from local.local_time)::integer = any(r.weekdays)
      and (extract(hour from local.local_time)::integer * 60
        + extract(minute from local.local_time)::integer) = any(r.local_minutes)
    where not exists (select 1 from public.tower_runs logs
      where logs.routine_code = r.code and logs.scheduled_for = slots.minute)
    order by slots.minute, r.code
  loop
    if tower_private.run_routine(due.code, due.minute) in ('success','blocked','error') then
      processed := processed + 1;
    end if;
  end loop;
  return processed;
end;
$$;

create function public.tower_run_now(routine_code text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  perform tower_private.require_owner();
  return tower_private.run_routine(routine_code, null);
end;
$$;

create function public.tower_set_routine(target_code text, active boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform tower_private.require_owner();
  update public.tower_routines set enabled = active,
    enabled_since = case when active and not enabled then clock_timestamp() else enabled_since end
  where code = target_code;
  return found;
end;
$$;

revoke all on all functions in schema tower_private from public;
revoke all on function public.tower_run_now(text), public.tower_set_routine(text,boolean) from public, anon;
grant execute on function public.tower_run_now(text), public.tower_set_routine(text,boolean) to authenticated;

create view public.tower_latest_runs with (security_invoker = on) as
select distinct on (routine_code) *
from public.tower_runs
order by routine_code, started_at desc, id desc;
revoke all on public.tower_latest_runs from public, anon, authenticated;
grant select on public.tower_latest_runs to authenticated;

-- 0017_tower_product_lab.sql
create function public.tower_create_opportunity(product_title text, problem_text text, market_country text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
begin
  perform tower_private.require_owner();
  insert into public.tower_opportunities (title, problem, country, created_by)
  values (btrim(product_title), btrim(problem_text), btrim(market_country), auth.uid()) returning id into target_id;
  insert into public.tower_stage_history (opportunity_id, stage, author_id)
  values (target_id, 'detectada', auth.uid());
  return target_id;
end;
$$;

create function public.tower_add_evidence(target_id uuid, link text, evidence_text text, evidence_kind text, observed_on date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_stage text;
begin
  perform tower_private.require_owner();
  select stage into current_stage from public.tower_opportunities where id = target_id for update;
  if current_stage is null or current_stage not in ('detectada','en_validacion') then
    raise exception 'La oportunidad no admite cambios de evidencia en esta etapa.';
  end if;
  if observed_on > (now() at time zone 'America/Bogota')::date then
    raise exception 'La fecha de evidencia no puede estar en el futuro.';
  end if;
  insert into public.tower_evidence (opportunity_id, source_url, observation, kind, captured_on, created_by)
  values (target_id, btrim(link), btrim(evidence_text), evidence_kind, observed_on, auth.uid())
  on conflict (opportunity_id, source_url, observation) do nothing;
  if not found then raise exception 'Esta observación ya está registrada.'; end if;

  if current_stage = 'detectada' and evidence_kind = 'observado' then
    update public.tower_opportunities set stage = 'en_validacion' where id = target_id;
    insert into public.tower_stage_history (opportunity_id, stage, author_id, comment)
    values (target_id, 'en_validacion', auth.uid(), 'Se registró una observación con fuente.');
  end if;
end;
$$;

create function public.tower_request_review(
  target_id uuid, pack_qty integer, pack_price integer, unit_cost integer,
  variable_cost integer, stock integer, compliance_evidence_id uuid, supplier_evidence_id uuid, demand_evidence_id uuid, compliance_verified boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  opportunity public.tower_opportunities;
  review_id uuid;
  contribution bigint;
  snapshot jsonb;
begin
  perform tower_private.require_owner();
  select * into opportunity from public.tower_opportunities where id = target_id for update;
  if opportunity.stage is distinct from 'en_validacion' then
    raise exception 'La oportunidad debe estar en validación.';
  end if;
  if not coalesce(pack_qty between 1 and 3 and pack_price >= 89900 and unit_cost > 0
      and variable_cost >= 0 and stock >= 100, false) then
    raise exception 'Verifica el pack, el precio, los costos y el stock mínimo de 100.';
  end if;
  if compliance_verified is distinct from true then
    raise exception 'Confirma la revisión de los requisitos de cumplimiento.';
  end if;
  if (select count(*) from public.tower_evidence e where e.opportunity_id = target_id
      and e.kind = 'observado' and e.id in (compliance_evidence_id, supplier_evidence_id, demand_evidence_id)) <> 3 then
    raise exception 'Selecciona tres evidencias observadas distintas para demanda, proveedor y cumplimiento.';
  end if;
  contribution := pack_price - pack_qty::bigint * unit_cost - variable_cost;
  if contribution < 35000 then raise exception 'El margen debe ser de al menos $35.000 COP.'; end if;

  select jsonb_build_object(
    'pack_qty', pack_qty, 'pack_price_cop', pack_price, 'unit_cost_cop', unit_cost,
    'variable_cost_cop', variable_cost, 'stock_documentado', stock,
    'contribucion_antes_de_pauta_cop', contribution, 'cpa_objetivo_cop', contribution / 2,
    'cumplimiento_revisado_por', auth.uid(), 'evidencia_cumplimiento', compliance_evidence_id, 'evidencia_proveedor', supplier_evidence_id,
    'evidencia_demanda', demand_evidence_id,
    'evidencias', jsonb_agg(jsonb_build_object('id', e.id, 'url', e.source_url, 'tipo', e.kind, 'fecha', e.captured_on) order by e.created_at)
  ) into snapshot from public.tower_evidence e where e.opportunity_id = target_id;
  update public.tower_opportunities set stage = 'pendiente_aprobacion', assessment = snapshot where id = target_id;
  insert into public.tower_approvals (opportunity_id, kind, title, payload)
  values (target_id, 'opportunity', opportunity.title, snapshot) returning id into review_id;
  insert into public.tower_stage_history (opportunity_id, stage, author_id, comment)
  values (target_id, 'pendiente_aprobacion', auth.uid(), 'Propuesta comercial enviada al Lobby.');
  return review_id;
end;
$$;

revoke all on function public.tower_create_opportunity(text,text,text),
  public.tower_add_evidence(uuid,text,text,text,date),
  public.tower_request_review(uuid,integer,integer,integer,integer,integer,uuid,uuid,uuid,boolean) from public, anon;
grant execute on function public.tower_create_opportunity(text,text,text),
  public.tower_add_evidence(uuid,text,text,text,date),
  public.tower_request_review(uuid,integer,integer,integer,integer,integer,uuid,uuid,uuid,boolean) to authenticated;

-- 0018_tower_cron.sql
create extension if not exists pg_cron;
select cron.schedule(
  'lumens-tower-minute',
  '* * * * *',
  $job$select tower_private.tick();$job$
);

-- 0019_tower_shopify_intake.sql
-- Keep Shopify intake separate from fulfillment until the order identities are matched.
create table public.tower_shopify_orders (
  shopify_id text primary key check (shopify_id ~ '^gid://shopify/Order/[0-9]+$'),
  created_at timestamptz not null,
  received_at timestamptz not null default now(),
  quantity integer check (quantity > 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  total_cop bigint check (total_cop >= 0 and currency = 'COP')
);
alter table public.tower_shopify_orders enable row level security;
revoke all on public.tower_shopify_orders from public, anon, authenticated;

create function public.tower_receive_shopify_order(
  order_id text, order_created_at timestamptz, order_quantity integer, order_currency text, order_total_cop bigint
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  received timestamptz := clock_timestamp();
begin
  insert into public.tower_shopify_orders (shopify_id, created_at, quantity, currency, total_cop)
  values (order_id, order_created_at, order_quantity, order_currency, order_total_cop)
  on conflict (shopify_id) do nothing;
  if not found then return false; end if;

  perform 1 from public.tower_routines where code = 'new-order' and enabled for share;
  if found then
    insert into public.tower_runs (routine_code, status, started_at, finished_at, output)
    values ('new-order', 'success', received, clock_timestamp(), jsonb_build_object(
      'fuente', 'Shopify · orders/create', 'pedido', order_id, 'unidades', order_quantity, 'moneda', order_currency,
      'total_pedido_cop', order_total_cop,
      'resultado', 'Pedido recibido. Confirmación pendiente de revisión humana.'
    ));
    if order_quantity >= 3 then
      insert into public.tower_alerts (code, routine_code, severity, message)
      values ('shopify:' || order_id, 'new-order', 'warning',
        'Pedido Shopify de tres o más unidades. Revisa la confirmación en Shopify.');
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.tower_receive_shopify_order(text,timestamptz,integer,text,bigint)
  from public, anon, authenticated;
grant execute on function public.tower_receive_shopify_order(text,timestamptz,integer,text,bigint) to service_role;

-- 0020_tower_landing_studio.sql
create table public.tower_landings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.tower_opportunities(id),
  approval_id uuid not null unique references public.tower_approvals(id),
  hero text not null check (octet_length(hero) between 1 and 49999),
  body text not null check (octet_length(body) between 1 and 49999),
  created_at timestamptz not null default now()
);
alter table public.tower_landings enable row level security;
revoke all on table public.tower_landings from public, anon, authenticated;
grant select on table public.tower_landings to authenticated;
create policy tower_owner_read on public.tower_landings for select to authenticated using ((select public.is_owner()));

create function public.tower_submit_landing(target_id uuid, hero_liquid text, body_liquid text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  opportunity public.tower_opportunities;
  review_id uuid;
  version_id uuid := gen_random_uuid();
begin
  perform tower_private.require_owner();
  select * into opportunity from public.tower_opportunities where id = target_id for update;
  if opportunity.stage is distinct from 'aprobada' then
    raise exception 'Aprueba la oportunidad antes de guardar el Liquid.';
  end if;
  if coalesce(octet_length(hero_liquid), 0) not between 1 and 49999
    or coalesce(octet_length(body_liquid), 0) not between 1 and 49999 then
    raise exception 'Cada bloque Liquid debe pesar menos de 50 KB.';
  end if;
  if position('clickOferta' in hero_liquid) = 0 or position('marcarOfertaReleasit' in hero_liquid) = 0
    or position('lmnCheckoutFormTarget' in hero_liquid) = 0 then
    raise exception 'El hero debe conservar los enlaces a Releasit de la plantilla validada.';
  end if;
  if exists (select 1 from public.tower_approvals where opportunity_id = target_id and kind = 'landing' and status = 'pending') then
    raise exception 'Ya hay una versión en el Lobby. Revísala para enviar otra.';
  end if;
  insert into public.tower_approvals (opportunity_id, kind, title, payload)
  values (target_id, 'landing', 'Landing · ' || opportunity.title, jsonb_build_object(
    'version', version_id, 'bytes_hero', octet_length(hero_liquid), 'bytes_cuerpo', octet_length(body_liquid)
  )) returning id into review_id;
  insert into public.tower_landings (id, opportunity_id, approval_id, hero, body)
  values (version_id, target_id, review_id, hero_liquid, body_liquid);
  return version_id;
end;
$$;

create function public.tower_decide_review(review_id uuid, decision text, rationale text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  review public.tower_approvals;
  next_stage text;
begin
  perform tower_private.require_owner();
  if decision is null or decision not in ('approved','rejected') or char_length(rationale) > 500 then
    raise exception 'Revisa la decisión y el comentario.';
  end if;
  select * into review from public.tower_approvals where id = review_id for update;
  if not found or review.status <> 'pending' then return false; end if;
  if review.kind = 'opportunity' then
    next_stage := case when decision = 'approved' then 'aprobada' else 'descartada' end;
    update public.tower_opportunities set stage = next_stage
      where id = review.opportunity_id and stage = 'pendiente_aprobacion';
    if not found then return false; end if;
    insert into public.tower_stage_history (opportunity_id, stage, author_id, comment)
    values (review.opportunity_id, next_stage, auth.uid(), nullif(btrim(rationale), ''));
  elsif review.kind = 'landing' and decision = 'approved' and nullif(btrim(rationale), '') is null then
    raise exception 'Registra el resultado de las pruebas de precio, packs, variantes y Releasit.';
  end if;
  update public.tower_approvals set status = decision, decided_at = now(),
    decided_by = auth.uid(), comment = nullif(btrim(rationale), '') where id = review_id;
  return true;
end;
$$;

revoke all on function public.tower_submit_landing(uuid,text,text), public.tower_decide_review(uuid,text,text) from public, anon;
grant execute on function public.tower_submit_landing(uuid,text,text), public.tower_decide_review(uuid,text,text) to authenticated;

-- 0021_tower_juliana_whatsapp.sql
create table public.tower_juliana_orders (
  order_id text primary key references public.tower_shopify_orders(shopify_id),
  contact jsonb not null check (jsonb_typeof(contact) = 'object'),
  status text not null default 'review' check (status in ('review','sending','submitted','unknown','confirmed','human')),
  attempt_id uuid unique,
  authorized_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.tower_juliana_orders enable row level security;
revoke all on public.tower_juliana_orders from public, anon, authenticated;
grant select on public.tower_juliana_orders to authenticated;
create policy tower_owner_read on public.tower_juliana_orders for select to authenticated using ((select public.is_owner()));
create index tower_juliana_updated_idx on public.tower_juliana_orders (updated_at desc);

create function public.tower_receive_juliana_order(
  order_id text, order_created_at timestamptz, order_quantity integer, order_currency text,
  order_total_cop bigint, contact jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.tower_receive_shopify_order(order_id, order_created_at, order_quantity, order_currency, order_total_cop) then
    return false;
  end if;
  if contact is not null and order_currency = 'COP' then
    insert into public.tower_juliana_orders (order_id, contact) values (order_id, contact);
  end if;
  return true;
end;
$$;

create function public.tower_claim_juliana(target_order text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  claimed public.tower_juliana_orders;
begin
  perform tower_private.require_owner();
  update public.tower_juliana_orders
    set status = 'sending', attempt_id = gen_random_uuid(), authorized_by = auth.uid(), updated_at = now()
    where order_id = target_order and status = 'review'
    returning * into claimed;
  if not found then return null; end if;
  return jsonb_build_object('attempt_id', claimed.attempt_id, 'contact', claimed.contact);
end;
$$;

create function public.tower_finish_juliana(target_order text, attempt uuid, next_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if next_status not in ('submitted','unknown','confirmed','human') or next_status is null then
    raise exception 'Invalid Juliana status';
  end if;
  update public.tower_juliana_orders
    set status = next_status, updated_at = now()
    where order_id = target_order and attempt_id = attempt and (
      status = 'sending'
      or (status in ('submitted','unknown') and next_status in ('confirmed','human'))
    );
  if not found then return false; end if;
  insert into public.tower_runs (routine_code, started_at, finished_at, status, output)
  values ('new-order', now(), now(), case when next_status in ('unknown','human') then 'blocked' else 'success' end,
    jsonb_build_object('fuente', 'Dapta · WhatsApp', 'pedido', target_order, 'estado', next_status));
  if next_status in ('unknown','human') then
    insert into public.tower_alerts (code, routine_code, severity, message)
    values ('juliana:' || target_order, 'new-order', 'warning',
      case when next_status = 'human' then 'Juliana derivó un pedido a atención humana. Revisa la bandeja de WhatsApp.'
      else 'Juliana necesita verificar un envío. Revisa Dapta antes de volver a escribir.' end)
    on conflict (code) do update set message = excluded.message, updated_at = now(), resolved_at = null;
  elsif next_status = 'confirmed' then
    update public.tower_alerts set resolved_at = now() where code = 'juliana:' || target_order and resolved_at is null;
  end if;
  return true;
end;
$$;

revoke all on function public.tower_receive_juliana_order(text,timestamptz,integer,text,bigint,jsonb),
  public.tower_finish_juliana(text,uuid,text) from public, anon, authenticated;
grant execute on function public.tower_receive_juliana_order(text,timestamptz,integer,text,bigint,jsonb),
  public.tower_finish_juliana(text,uuid,text) to service_role;
revoke all on function public.tower_claim_juliana(text) from public, anon;
grant execute on function public.tower_claim_juliana(text) to authenticated;

-- 0022_tower_morning_reports.sql
-- All offices open their reporting routine at 07:00 America/Bogota.
update public.tower_routines
set local_minutes = array[420]
where code in ('ad-metrics', 'daily-profit', 'international-radar', 'local-radar', 'weekly-radar', 'seasonal-radar');

insert into public.tower_routines (code, agent_code, name, cadence, local_minutes, weekdays, enabled)
select 'shift-report-' || lower(code), code, 'Reporte de las 7:00 a. m.', 'scheduled',
  array[420], array[0,1,2,3,4,5,6], true
from public.tower_agents;

create function tower_private.report_morning(target_code text, occurrence timestamptz)
returns text language plpgsql set search_path = '' as $$
declare
  office public.tower_routines;
  last_activity record;
  report jsonb;
  result text := 'success';
  slot date := (coalesce(occurrence, now()) at time zone 'America/Bogota')::date;
begin
  select * into office from public.tower_routines
    where code = target_code and code like 'shift-report-%' and enabled for share;
  if not found or (occurrence is not null and office.enabled_since >= occurrence + interval '1 minute') then
    return 'inactive';
  end if;

  report := jsonb_build_object('fecha', slot);
  if office.agent_code = '0' then
    report := report || jsonb_build_object(
      'autorizaciones_pendientes', (select count(*) from public.tower_approvals where status = 'pending'),
      'alertas_abiertas', (select count(*) from public.tower_alerts where resolved_at is null)
    );
  elsif office.agent_code = '6A' then
    report := report || jsonb_build_object(
      'pedidos_por_autorizar', (select count(*) from public.tower_juliana_orders where status = 'review'),
      'pedidos_para_revision_humana', (select count(*) from public.tower_juliana_orders where status in ('unknown','human'))
    );
  else
    select r.name, run.status, run.output into last_activity
    from public.tower_runs run join public.tower_routines r on r.code = run.routine_code
    where r.agent_code = office.agent_code and r.code not like 'shift-report-%'
      and (coalesce(run.scheduled_for, run.started_at) at time zone 'America/Bogota')::date = slot
    order by run.started_at desc, run.id desc limit 1;

    if found then
      report := report || jsonb_build_object('rutina', last_activity.name);
      result := case when last_activity.status in ('success','error','blocked') then last_activity.status else 'blocked' end;
      report := report || case
        when last_activity.status = 'running' then jsonb_build_object('motivo', 'La última tarea aún está en ejecución.')
        else coalesce(last_activity.output, '{}'::jsonb)
      end;
    else
      result := 'blocked';
      report := report || jsonb_build_object('motivo', 'Aún no hay una tarea operativa ejecutada hoy. Revisa las rutinas y sus conexiones.');
    end if;
  end if;

  insert into public.tower_runs (routine_code, scheduled_for, started_at, finished_at, status, output)
  values (target_code, occurrence, now(), now(), result, report)
  on conflict (routine_code, scheduled_for) do nothing;
  if not found then return 'duplicate'; end if;
  return result;
end;
$$;
revoke all on function tower_private.report_morning(text,timestamptz) from public;

create or replace function tower_private.tick(at_time timestamptz default now())
returns integer language plpgsql set search_path = '' as $$
declare
  due record;
  processed integer := 0;
  outcome text;
begin
  if not pg_try_advisory_xact_lock(172714, 1) then return 0; end if;
  for due in
    select r.code, slots.minute
    from pg_catalog.generate_series(date_trunc('minute', at_time) - interval '10 minutes',
      date_trunc('minute', at_time), interval '1 minute') as slots(minute)
    cross join lateral (select slots.minute at time zone 'America/Bogota' as local_time) local
    join public.tower_routines r on r.enabled and r.cadence = 'scheduled'
      and r.enabled_since < slots.minute + interval '1 minute'
      and extract(dow from local.local_time)::integer = any(r.weekdays)
      and (extract(hour from local.local_time)::integer * 60
        + extract(minute from local.local_time)::integer) = any(r.local_minutes)
    where not exists (select 1 from public.tower_runs logs
      where logs.routine_code = r.code and logs.scheduled_for = slots.minute)
    order by slots.minute, (r.code like 'shift-report-%'), r.code
  loop
    if due.code like 'shift-report-%' then
      outcome := tower_private.report_morning(due.code, due.minute);
    else
      outcome := tower_private.run_routine(due.code, due.minute);
    end if;
    if outcome in ('success','blocked','error') then processed := processed + 1; end if;
  end loop;
  return processed;
end;
$$;

create or replace function public.tower_run_now(routine_code text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  perform tower_private.require_owner();
  if routine_code like 'shift-report-%' then
    return tower_private.report_morning(routine_code, null);
  end if;
  return tower_private.run_routine(routine_code, null);
end;
$$;

commit;

select
  (select count(*) from public.tower_agents) as oficinas,
  (select count(*) from public.tower_routines
    where code like 'shift-report-%' and enabled) as reportes_programados,
  exists (
    select 1 from cron.job where jobname = 'lumens-tower-minute' and active
  ) as programador_activo;
