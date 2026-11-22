-- Run on an isolated database with the local preview seed.
begin;
do $$
declare
  demo_order constant text := 'gid://shopify/Order/900000002';
  demo_owner uuid;
  claimed jsonb;
  attempt uuid;
begin
  select id into strict demo_owner from public.profiles where email = 'operaciones@lumens-demo.invalid';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', demo_owner)::text, true);
  perform set_config('request.jwt.claim.sub', demo_owner::text, true);

  if public.tower_receive_juliana_order(demo_order, now(), 3, 'COP', 169900, '{}'::jsonb) then
    raise exception 'Repeated Shopify event created a duplicate';
  end if;
  if public.tower_finish_juliana(demo_order, gen_random_uuid(), 'confirmed') then
    raise exception 'An unclaimed order accepted a callback';
  end if;

  claimed := public.tower_claim_juliana(demo_order);
  attempt := (claimed->>'attempt_id')::uuid;
  if attempt is null or public.tower_claim_juliana(demo_order) is not null then
    raise exception 'Expected one WhatsApp dispatch per order';
  end if;
  if public.tower_finish_juliana(demo_order, gen_random_uuid(), 'confirmed') then
    raise exception 'Wrong dispatch attempt accepted';
  end if;
  if not public.tower_finish_juliana(demo_order, attempt, 'submitted') then
    raise exception 'Dapta acceptance did not persist';
  end if;
  if not public.tower_finish_juliana(demo_order, attempt, 'confirmed') then
    raise exception 'Customer confirmation did not persist';
  end if;
  if public.tower_finish_juliana(demo_order, attempt, 'human') then
    raise exception 'Final callback rewrote confirmation';
  end if;
end;
$$;
rollback;
