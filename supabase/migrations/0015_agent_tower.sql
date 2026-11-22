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
