# LUMENS OS

App interna de gestión para **LUMENS**, un ecommerce de **pago contra entrega (PCE)** en Colombia (productos dropshipping, ventas por Meta/TikTok Ads, fulfillment por **Dropi**). Centraliza contabilidad, análisis de pedidos, llamadas de confirmación por IA, costeo de productos, campañas, research y generación de contenido con IA.

Dominio en producción: **lumensos.vercel.app**

---

## Stack

- **Next.js 14.2** (App Router) · **React 18** · **TypeScript strict**
- **Tailwind v3.4** + **shadcn/ui** (Radix, estilo new-york)
- **Supabase** (Postgres 17, Auth, RLS, Storage) — project ref `pdzezapojhgdljfzvaxg`
- **OpenRouter** (IA, compatible con OpenAI) vía paquete `openai`
- **Dapta** (agente de voz "Juliana" para confirmar pedidos)
- Gráficos: `recharts` · Excel: `xlsx` · Uploads: `react-dropzone` · Toasts: `sonner` · Markdown: `react-markdown`

## Comandos (¡usar pnpm, NO npm!)

```bash
pnpm dev      # desarrollo
pnpm build    # build de producción (corre typecheck + lint)
pnpm lint     # eslint
```

⚠️ **El proyecto es pnpm** (hay `pnpm-lock.yaml`). `npm install` falla ("Cannot read properties of null"). Para agregar deps: `pnpm add <pkg>`.
⚠️ Engine pide Node 20.x; funciona en Node 24 con un warning inofensivo.

## Despliegue

- Repo: `git@github.com:lumensecom/lumens-OS.git` (rama **main**, push por SSH deploy key).
- **Vercel auto-despliega en cada push a `main`.** No hay staging; se trabaja directo sobre main.
- Flujo estándar de un cambio: editar → `pnpm build` (verificar ✓) → `pnpm lint` → `git commit` → `git push origin main`.
- Las **env vars viven en Vercel** (Settings → Environment Variables). Solo aplican tras un **Redeploy**. Nunca poner secretos en el código ni en el chat.

---

## Convenciones de código

- **Server Components + Server Actions** por defecto. Data fetching en el server (`lib/supabase/server.ts`).
- Patrón de `lib/`: un archivo **`x.ts`** con lógica pura + schemas (importable desde cliente) y **`x-queries.ts`** con las consultas server-only (usan `next/headers`). Ej: `settings.ts` (puro) vs `settings-queries.ts` (server). **No importar `next/headers` en código que corra en cliente** → rompe el build.
- Clientes Supabase: `lib/supabase/server.ts` (RSC/actions), `client.ts` (browser), `admin.ts` (service-role), `middleware.ts` (refresco de sesión).
- Formato de moneda/números: `lib/format.ts` (`formatCOP`, `formatNumber`, `formatPercent`), locale es-CO.
- Textos de UI en **español colombiano**.
- Migraciones SQL en `supabase/migrations/`. Algunas se aplican vía Supabase MCP (`apply_migration`) sin dejar archivo local (ej. `call_results`).

---

## Módulos (`app/(dashboard)/`)

**Funcionales:**
- `/` — **Hub** central: métricas (utilidad del mes, confirmados hoy por Juliana, productos activos) + launcher de herramientas (`lib/tools.ts`) + panel de novedades (`lib/changelog.ts`).
- `/contabilidad` — ingresos/gastos, utilidad, metas A/B, gráfico de flujo de caja.
- `/analisis-dropi` — sube el `.xlsx` de Dropi → KPIs, utilidad real (resta ads manual), pedidos por confirmar, detalle. Incluye **Generador de mensajes WhatsApp** (`lib/dropi-messages.ts`). Parsing en `lib/dropi.ts` (client-side).
- `/llamadas` — **Juliana**: pega el listado de Dropi → selecciona → barra flotante **"Llamar con Juliana"** dispara el flujo de Dapta. Filtros por estado, lectura del análisis de cada llamada. El botón solo aparece con pedidos pegados y requiere `DAPTA_FLOW_WEBHOOK_URL`.
- `/productos` — catálogo + costeo (margen, precio mínimo, regla del 50%). `/productos/costeo` tabla estilo Excel. Vista `products_with_margin`.
- `/campanas` — semáforo CPA vs margen, ROAS, subir CSV de Meta/TikTok.
- `/research` — validación de productos (5 criterios) + pipeline por estado.
- `/creativos` — biblioteca de videos, hooks y ángulos (thumbnails en bucket privado con signed URLs).
- `/conocimiento` — base de conocimiento (categorías, artículos, buscador, pin).
- `/ai` — **AI Studio** (ver abajo).
- `/configuracion` — metas, costeo por defecto, contexto de marca para la IA. Alimenta Contabilidad/Productos/AI.

**Pendientes (Fase 2, hoy placeholders):**
- `/pedidos` y `/clientes` — se conectarán a **Shopify** (Admin GraphQL API, solo lectura: pedidos, clientes, ventas brutas). Diseño acordado: fetch server-side, env vars `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ADMIN_TOKEN`. **No iniciado.**

Nota: Productos/Campañas/Research/Creativos usan `ModulePlaceholder` solo como **estado vacío** — SÍ son funcionales.

---

## Integraciones

### AI Studio (`/ai`) — OpenRouter
- Endpoint: `app/api/ai/route.ts`. Config de modelos: `lib/ai-models.ts`. Tareas: `lib/ai.ts` (libre, hooks, script, landing, liquid, imagen).
- **Proveedor: OpenRouter** (compatible con OpenAI, `baseURL` en `lib/ai-models.ts`). **Una sola `OPENROUTER_API_KEY`** (empieza con `sk-or-...`) da acceso a todos los modelos gratis (`:free`).
- Ruteo de modelos: texto/copy → **Nemotron 3 Ultra**; Liquid → **North Mini Code**; si hay imágenes → **Gemma 4** (único multimodal). Ver `resolveModel()`.
- Responde en **streaming de texto plano** (la UI `components/ai/ai-studio.tsx` lee `res.body.getReader()`; solo se reenvía `delta.content`, nunca el razonamiento).
- El system prompt inyecta `settings.ai_brand_context` desde Configuración.
- **Límites del tier gratis:** 20 req/min; 50/día si nunca compraste crédito, 1.000/día si compraste $10+ (una vez, permanente). Los 429 fallidos también cuentan. El modelo de imágenes gratis (Gemma) se satura y da 429 con frecuencia.
- **Historial:** antes usaba Claude (`@anthropic-ai/sdk`); se migró a OpenRouter porque el usuario no paga la API de Claude. No reintroducir Anthropic sin pedirlo.

### Dapta — Juliana (agente de voz)
- Confirma pedidos PCE por llamada. Se dispara desde `/llamadas` → `app/api/dapta/call/route.ts` (un request por pedido al webhook del flujo, en tandas de 20).
- Resultado de la llamada vuelve por `app/api/webhooks/dapta/route.ts` → tabla `call_results` (outcome: confirmado/cancelado/reprogramado/no_contesta). Visible en `/llamadas` y en el Hub.
- Payload y validación: `lib/dapta.ts`.
- Gotchas Dapta (documentados por dolor): en flows los code nodes usan `module.exports = {...}` (no `return`); las variables van como **array** `{key,value}`; `from_number` debe ser un número provisionado en Dapta; el `agent_id` se guarda con prefijo `agent_` que la plataforma antepone sola.
- La conexión MCP de Dapta es del usuario (`juanfelipelopezlara3@gmail.com`); no se puede cambiar desde una sesión no interactiva.

### Dropi
- No hay API oficial conectada: el usuario **exporta `.xlsx`** (Análisis Dropi) o **copia el listado de texto** (Llamadas / mensajes). Parsers: `lib/dropi.ts`, `lib/dropi-messages.ts`.

---

## Marca y diseño

- Colores: amarillo `#F5C518` (primary), negro `#1A1A1A`, beige `#FFF8F5`, verde `#22a55b`, rojo `#ef4444`, morado `#7C3AED`.
- Tipografías: **Syne** (display), **DM Sans** (body), **DM Mono** (números).
- `app/globals.css` define utilidades del sistema: `.page-title`, `.text-gradient`, `.hover-lift`, `.float-bar` + `.glass`, `.chip`/`.chip-active`, `.stagger`, `.page-enter`, `.pulse-glow`. Reusarlas en vez de inventar estilos nuevos.
- Componentes `components/ui/*` ya están calibrados (botones con gradiente, inputs/tabs/select con foco amarillo, tablas legibles). Mantener ese lenguaje premium, mobile-first, y **theme-aware** (claro/oscuro).
- `StatCard` (`components/dashboard/stat-card.tsx`) para métricas.

---

## Variables de entorno (en Vercel; ejemplo en `.env.example`)

| Var | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente admin (server) |
| `NEXT_PUBLIC_APP_URL` | URL base |
| `OPENROUTER_API_KEY` | IA del AI Studio (`sk-or-...`) |
| `DAPTA_FLOW_WEBHOOK_URL` | Dispara llamadas de Juliana |
| `DAPTA_WEBHOOK_SECRET` / `DAPTA_RESULT_SECRET` | Opcionales (validar webhooks) |
| `DROPI_WEBHOOK_SECRET` | Valida `/api/webhooks/dropi` |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_TOKEN` | *(planeado, Fase 2)* |

---

## Reglas de trabajo con el usuario

- Responder en **español**, claro y directo. El usuario es el dueño del negocio, no es developer: explicar el "para qué", no solo el "cómo".
- **Nunca pedir ni aceptar secretos por el chat.** Las keys las pega el usuario en Vercel; el código las lee de `process.env`. Si pega un secreto, avisarle que lo **rote**.
- No puedo modificar Vercel ni cambiar conexiones MCP desde la sesión; guío al usuario para que lo haga.
- Verificar datos volátiles (modelos de IA, límites, precios) con búsqueda web en vez de la memoria.
