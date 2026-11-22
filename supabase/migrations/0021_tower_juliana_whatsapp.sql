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
