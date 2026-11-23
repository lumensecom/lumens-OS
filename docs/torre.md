# Torre de agentes

El dueño entra a `/torre`. El panel anterior queda en `/resumen`. En la torre se consultan 18 oficinas, sus horarios de Bogotá, el resultado de cada ejecución y las decisiones del Lobby. La torre usa el propietario existente de Supabase.

## Instalación y despliegue

1. Usa Node 24 y ejecuta `pnpm install --frozen-lockfile`.
2. En un proyecto Supabase de prueba, aplica las migraciones del repositorio. Verifica `0015` a `0020` y la disponibilidad de `pg_cron`. Ejecuta `supabase/tests/tower.sql` con `psql -v ON_ERROR_STOP=1` conectado a esa base de prueba.
3. Para producción, desde un entorno autorizado haz `supabase migration list --linked` y `supabase db push --dry-run`. Confirma que el proyecto vinculado es el correcto y que el historial está alineado. Aplica las migraciones pendientes con `supabase db push` antes del despliegue de la app. El repositorio existente despliega `main` en Vercel.
4. Verifica que Vercel tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Usa `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor. Haz `pnpm build` o arranca el servidor con `pnpm dev`. GitHub Actions reproduce el build en los PR.
5. Entra como dueño, abre el PH y ejecuta el brief manual. En Supabase verifica el job `lumens-tower-minute` y su historial en `cron.job_run_details`. El job se ejecuta cada minuto y revisa las franjas locales pendientes de los últimos diez minutos. La clave única de rutina y franja evita repetir una ejecución programada.

## Rutinas conectadas

- El PH prepara el brief de las 7:30 a. m., el cierre y el plan del lunes con Contabilidad, Product Lab y el Lobby. Los importes son los registrados. Las cifras ausentes se muestran como «Sin dato».
- El piso 7 resume las métricas registradas en Campañas y el saldo registrado en Contabilidad. El saldo contable no permite inferir la utilidad realizada por pedido entregado.
- El piso 6 revisa novedades de los registros de pedidos existentes. Para habilitar la recepción de Shopify, configura `SHOPIFY_STORE_DOMAIN` con el dominio permanente y `SHOPIFY_WEBHOOK_SECRET` con el secreto firmante. Registra `orders/create` para `/api/webhooks/shopify` en la app Shopify autorizada. Verifica con un pedido de prueba. La recepción comprueba la firma del cuerpo, registra un evento único por pedido, excluye datos de contacto de la bitácora y abre una alerta con tres unidades o más.
- Radar, valoraciones automáticas con fuentes externas y reseñas requieren los conectores y flujos respectivos. Las rutinas programadas que necesitan esas fuentes registran el motivo del bloqueo. La rutina de reseñas viene desactivada. El miércoles de refresco creativo conserva la hora pendiente de definir.

## De una señal a una landing

1. Crea la oportunidad en Product Lab. Registra fuentes con fecha y distingue observaciones, estimaciones e hipótesis.
2. Adjunta observaciones de demanda, proveedor y cumplimiento. Ingresa precio del pack, costos COP y stock. El sistema calcula contribución antes de pauta y revisa el stock y margen mínimos. La validación comercial y regulatoria registrada corresponde al dueño.
3. Envía la propuesta al Lobby. Al decidir, quedan registrados el expediente evaluado, el autor, la fecha y el comentario.
4. Para una oportunidad aprobada, adapta los dos bloques de [las plantillas validadas](landing/plantillas/) de la skill LUMENS Producto. Los precios, beneficios, medios, garantías y textos de las plantillas corresponden al producto de referencia. Sustitúyelos por datos aprobados de la nueva oportunidad y retira cualquier oferta sin respaldo. Guarda ambos en Landing Studio. El control técnico inicial verifica el peso de cada bloque y la presencia de los enlaces de Releasit en el hero.
5. Revisa una vista privada de Shopify con precios, packs, variantes, carga móvil y checkout. Registra la prueba en el Lobby para aprobar esa versión. Los dos archivos descargables se habilitan con la aprobación. La publicación se realiza en Shopify por separado.

La automatización de producción de guiones y edición de video requiere habilitar el flujo creativo, los proveedores de medios y el material aprobado. El trabajo de la torre no crea campañas, cambia precios ni contacta clientes.

## Vista de operación

La pantalla `/torre` muestra el edificio interactivo, con oficinas seleccionables, iluminación de día o noche, zoom y pantalla completa. La bitácora, los estados y los contadores consultan la base con la sesión del dueño cada cinco segundos mientras la pestaña está visible. Una ejecución manual sincroniza la vista al terminar. Si la conexión se interrumpe, la pantalla conserva la última lectura y muestra «Reconectando».

La demo local está separada de la operación. Cuando el servidor de prueba se inicia con `LUMENS_LOCAL_PREVIEW=1`, la pantalla muestra «Demo local» para identificar sus datos de prueba.

## Confirmación por WhatsApp

La bandeja [Juliana](juliana.md) muestra los pedidos nuevos de Shopify y espera la autorización del dueño antes de enviarlos al flujo de Dapta.

Si la consulta al esquema de la torre falla tras desplegar la app, el inicio abre Resumen. El enlace de la torre muestra el estado de conexión al dueño hasta que Supabase responda con el esquema actualizado.
