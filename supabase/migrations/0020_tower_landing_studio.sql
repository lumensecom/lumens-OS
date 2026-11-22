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
