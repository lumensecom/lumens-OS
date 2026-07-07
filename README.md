# LUMENS OS

Plataforma interna de gestión del negocio de ecommerce PCE (Pago Contra Entrega) para Colombia.
Herramienta operativa privada — no es un producto SaaS.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v3** + **shadcn/ui** (estilo new-york, Radix)
- **Supabase** (Postgres + Auth + Storage + RLS)
- **pnpm** · Node **20.x** · Deploy en **Vercel**

## Estado

**Sprint 1 completo** — Fundación: login, middleware de auth, layout con sidebar/topbar,
dashboard home y placeholders de todos los módulos. Base de datos con las 17 tablas,
RLS y seed inicial (6 productos, 8 categorías de conocimiento, 3 artículos).

Módulos por construir: Contabilidad y Campañas (Sprint 2), Productos y Conocimiento
(Sprint 3), Research y Creativos (Sprint 4). Pedidos y Clientes son Fase 2.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # y completa los valores
pnpm dev
```

### Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # secreto, solo server-side
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

El `service_role` key se copia desde el dashboard de Supabase:
**Project Settings → API → service_role**.

## Base de datos

Las migraciones están en `supabase/migrations/` (orden `0001` → `0011`) y el seed en
`supabase/seed.sql`. Ya fueron aplicadas al proyecto Supabase `lumens-os`. Para regenerar
los tipos de TypeScript tras un cambio de esquema:

```bash
supabase gen types typescript --project-id <ref> > lib/database.types.ts
```

### Storage buckets (crear en el dashboard)

`products` (público), `creatives` (privado), `research` (privado),
`knowledge` (privado), `avatars` (público).

## Primer usuario

El **primer** usuario que se registra queda como `owner` automáticamente (trigger
`handle_new_user`). Los siguientes quedan como `collaborator`.

> Nota: si Supabase Auth tiene activada la confirmación de correo, el primer registro
> pedirá confirmar el email. Para uso interno puedes desactivarla en
> **Authentication → Providers → Email → Confirm email**.

## Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build de producción
pnpm lint     # ESLint
pnpm start    # servir el build
```
