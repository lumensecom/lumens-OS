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
