-- Run as a database administrator against an isolated test database.
begin;

-- The first profile is bootstrapped by the legacy auth trigger. Explicit roles make
-- this test independent of demo users in a local database.
insert into auth.users (id, email) values
  ('f0000000-0000-4000-8000-000000000001', 'tower-owner@example.invalid'),
  ('f0000000-0000-4000-8000-000000000002', 'tower-staff@example.invalid');
update public.profiles set role = 'owner' where id = 'f0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'collaborator' where id = 'f0000000-0000-4000-8000-000000000002';

do $$
begin
  if (select count(*) from public.tower_agents) <> 18 then raise exception 'Expected 18 agents'; end if;
  if (select count(*) from public.tower_routines) <> 27 then raise exception 'Expected 27 routines'; end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);

do $$
begin
  if exists (select 1 from public.tower_agents) then raise exception 'Collaborator can see the tower'; end if;
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    raise exception 'Collaborator promoted their role';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.tower_run_now('brief');
    raise exception 'Collaborator ran a routine';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.tower_receive_shopify_order('gid://shopify/Order/991', now(), 3, 'COP', 200000);
    raise exception 'Authenticated user bypassed verified Shopify intake';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);

do $$
declare
  target_id uuid;
  supplier_id uuid;
  demand_id uuid;
  compliance_id uuid;
  review_id uuid;
  landing_id uuid;
  landing_review uuid;
begin
  if not public.is_owner() then raise exception 'Owner fixture is invalid'; end if;
  if public.tower_run_now('brief') <> 'success' then raise exception 'Owner could not create brief'; end if;
  if public.tower_run_now('local-radar') <> 'blocked' then raise exception 'Missing connector was not blocked'; end if;
  if public.tower_run_now('new-order') <> 'inactive' then raise exception 'Event routine should be unavailable to manual runs'; end if;
  target_id := public.tower_create_opportunity('Producto de prueba', 'Problema de prueba', 'Colombia');
  perform public.tower_add_evidence(target_id, 'https://example.invalid/hypothesis', 'Hipótesis de prueba', 'hipotesis', current_date - 1);
  begin
    perform public.tower_add_evidence(target_id, 'https://example.invalid/hypothesis', 'Hipótesis de prueba', 'observado', current_date - 1);
    raise exception 'Reusing an observation overwrote its status';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Esta observación ya está registrada.' then raise; end if;
  end;
  if (select stage from public.tower_opportunities where id = target_id) <> 'detectada' then
    raise exception 'A hypothesis advanced to validation';
  end if;
  begin
    perform public.tower_request_review(target_id, 1, 89900, 30000, 18000, 365, null, null, null, true);
    raise exception 'Opportunity skipped validation';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'La oportunidad debe estar en validación.' then raise; end if;
  end;
  perform public.tower_add_evidence(target_id, 'https://example.invalid/supplier', 'Proveedor de prueba', 'observado', current_date - 1);
  perform public.tower_add_evidence(target_id, 'https://example.invalid/compliance', 'Cumplimiento de prueba', 'observado', current_date - 1);
  perform public.tower_add_evidence(target_id, 'https://example.invalid/demand', 'Demanda de prueba', 'observado', current_date - 1);
  select id into demand_id from public.tower_evidence where observation = 'Demanda de prueba';
  select id into supplier_id from public.tower_evidence where observation = 'Proveedor de prueba';
  select id into compliance_id from public.tower_evidence where observation = 'Cumplimiento de prueba';

  begin
    perform public.tower_request_review(target_id, 1, 89900, 30000, 18000, 365, compliance_id, supplier_id, demand_id, false);
    raise exception 'Compliance confirmation was bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Confirma la revisión de los requisitos de cumplimiento.' then raise; end if;
  end;
  begin
    perform public.tower_request_review(target_id, 1, 89900, 60000, 18000, 365, compliance_id, supplier_id, demand_id, true);
    raise exception 'Unprofitable opportunity reached the Lobby';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'El margen debe ser de al menos $35.000 COP.' then raise; end if;
  end;

  review_id := public.tower_request_review(target_id, 1, 89900, 30000, 18000, 365, compliance_id, supplier_id, demand_id, true);
  if not public.tower_decide_review(review_id, 'approved', 'Caso de prueba') then raise exception 'Approval was not persisted'; end if;
  if public.tower_decide_review(review_id, 'rejected', 'Retry') then raise exception 'Approval was decided twice'; end if;
  if (select stage from public.tower_opportunities where id = target_id) <> 'aprobada' then
    raise exception 'Approved opportunity did not advance';
  end if;
  if (select payload->>'contribucion_antes_de_pauta_cop' from public.tower_approvals where id = review_id) <> '41900' then
    raise exception 'Invalid contribution';
  end if;
  if (select count(*) from public.tower_stage_history h where h.opportunity_id = target_id) <> 4 then
    raise exception 'Missing stage history';
  end if;
  begin
    perform public.tower_submit_landing(target_id, 'missing checkout identifiers', 'body');
    raise exception 'Invalid landing was sent to approval';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'El hero debe conservar los enlaces a Releasit de la plantilla validada.' then raise; end if;
  end;
  landing_id := public.tower_submit_landing(target_id, 'clickOferta marcarOfertaReleasit lmnCheckoutFormTarget', 'Fixture');
  select approval_id into landing_review from public.tower_landings where id = landing_id;
  begin
    perform public.tower_decide_review(landing_review, 'approved', '');
    raise exception 'Landing approved without a QA record';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Registra el resultado de las pruebas de precio, packs, variantes y Releasit.' then raise; end if;
  end;
  if not public.tower_decide_review(landing_review, 'approved', 'QA local de prueba') then
    raise exception 'Landing approval was not persisted';
  end if;
end;
$$;

reset role;

update public.tower_routines set enabled_since = '2026-01-01T00:00:00Z';
insert into public.revenue_entries (date, gross_amount) values ('2026-06-09', 100000);
insert into public.expense_entries (date, category, amount) values ('2026-06-09', 'shipping', 20000);

do $$
begin
  if tower_private.tick('2026-06-10T12:32:00Z') <> 1 then raise exception 'Missed 07:30 Bogotá slot'; end if;
  if tower_private.tick('2026-06-10T12:33:00Z') <> 0 then raise exception 'A scheduled slot ran twice'; end if;
  if not exists (
    select 1 from public.tower_runs where routine_code = 'brief'
      and scheduled_for = '2026-06-10T12:30:00Z' and status = 'success'
      and (output->>'saldo_registrado_cop')::numeric = 80000
  ) then raise exception 'Brief did not use registered figures'; end if;

  update public.tower_routines set enabled = false where code = 'delivery-check';
  if tower_private.tick('2026-06-10T14:00:00Z') <> 0 then raise exception 'Disabled routine ran'; end if;
  if tower_private.tick('2026-06-15T11:00:00Z') <> 3 then raise exception 'Monday schedules were not respected'; end if;
end;
$$;

set local role service_role;
do $$
begin
  if not public.tower_receive_shopify_order('gid://shopify/Order/991', now(), 3, 'COP', 200000) then
    raise exception 'Shopify intake did not insert';
  end if;
  if public.tower_receive_shopify_order('gid://shopify/Order/991', now(), 3, 'COP', 200000) then
    raise exception 'Shopify retry was duplicated';
  end if;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.tower_alerts where code = 'shopify:gid://shopify/Order/991') <> 1 then
    raise exception 'Large order alert missing or duplicated';
  end if;
end;
$$;

rollback;
