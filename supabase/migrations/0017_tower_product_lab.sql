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
