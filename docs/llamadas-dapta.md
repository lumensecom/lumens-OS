# Llamadas de Juliana con datos del pedido

Aplica [0023_dapta_call_history.sql](../supabase/migrations/0023_dapta_call_history.sql) en el proyecto Supabase de LUMENS, después de las migraciones de la Torre. Conserva el historial existente y agrega el registro de intentos.

En Vercel configura `DAPTA_FLOW_WEBHOOK_URL`, `DAPTA_RESULT_SECRET` y la credencial de servidor `SUPABASE_SERVICE_ROLE_KEY`. Si el flujo de salida valida un secreto, configura `DAPTA_WEBHOOK_SECRET` y haz que acepte el encabezado `x-webhook-secret`.

Desde **Llamadas IA**, pega pedidos de Dropi con número de orden, producto, cliente, fecha, teléfono, ciudad y dirección. Puedes añadir líneas `Cantidad: 2` y `Total: $149.900 COP` al bloque si esos datos están confirmados. **Ver datos** muestra lo que se enviará. Selecciona los pedidos y presiona **Llamar con Juliana**.

## Variables del flujo de voz

El webhook de entrada recibe `customer_name`, `product_name`, `order_date`, `address`, `city`, `department`, `order_id`, `phone`, `attempt_id` y, si se aportaron, `quantity` y `total_cop`. El teléfono conserva el formato numérico colombiano de la integración anterior (`573XXXXXXXXX`). Si el nodo de voz exige el prefijo E.164, agrega el signo + en el nodo de Dapta. Pasa estos campos como variables dinámicas a Juliana. Cuando `total_cop` o `quantity` falten, Juliana debe omitir la cifra.

En el webhook de resultado apunta a `/api/webhooks/dapta` del dominio de LUMENS OS. Usa `x-webhook-secret` con el valor de `DAPTA_RESULT_SECRET`. Si tu configuración de Dapta solo permite una URL, se acepta el parámetro `secret`. Devuelve `order_id` y `attempt_id` en las variables dinámicas, el identificador de llamada y el desenlace en `call_analysis.custom_analysis_data.resultado`. También se guardan el resumen y la duración si llegan. El mismo resultado puede llegar de nuevo sin crear una llamada adicional.

**En cola** indica que el webhook aceptó el envío. **Verificar en Dapta** indica que la respuesta del proveedor es ambigua o el análisis requiere revisión. Si el análisis falta, revisa el intento en Dapta y reenvía su webhook con el identificador original. Los pedidos que no contestaron o pidieron reagendar se pueden seleccionar de nuevo.
