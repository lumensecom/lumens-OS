-- LUMENS OS · 0011 · Hardening de funciones SECURITY DEFINER
-- handle_new_user es un trigger: nadie debe poder invocarlo por RPC.
-- (Los triggers se ejecutan sin requerir EXECUTE del usuario que dispara la sentencia.)
revoke execute on function public.handle_new_user() from public;

-- is_owner se usa dentro de políticas RLS: 'authenticated' necesita EXECUTE,
-- pero 'anon' no debe poder llamarla por RPC.
revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;
