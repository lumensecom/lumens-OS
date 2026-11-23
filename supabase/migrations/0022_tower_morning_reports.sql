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
