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
