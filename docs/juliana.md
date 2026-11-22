# Juliana por WhatsApp

La bandeja de la torre recibe pedidos nuevos firmados de Shopify. Juliana prepara el mensaje usando el nombre de producto registrado, separa el envío prioritario y muestra la ciudad en mayúsculas. Cuando un producto tiene su ID de Shopify y una URL de producto de lumenscol.com en el catálogo de LUMENS OS, el mensaje incluye ese enlace.

El dueño autoriza cada primer mensaje desde Torre → Juliana. «En manos de Dapta» significa que el flujo dio un HTTP 2xx. «Confirmado» se registra al recibir la respuesta afirmativa del cliente desde Dapta. Si se corta la conexión después de autorizar, revisa la conversación en Dapta antes de escribirle al cliente. El MVP evita reintentar el envío automáticamente.

## Conectar en producción

1. Aplica la migración `0021_tower_juliana_whatsapp.sql` en Supabase antes de desplegar el código. Configura el webhook `orders/create` de Shopify y sus variables de servidor.
2. En Dapta, conecta el WhatsApp de LUMENS al agente Juliana que ya creaste y desactiva las respuestas del bot anterior para ese número.
3. Configura un flujo HTTP dedicado a WhatsApp, separado del flujo de llamadas. En el servidor de LUMENS configura `DAPTA_WHATSAPP_WEBHOOK_URL`, `DAPTA_WHATSAPP_WEBHOOK_SECRET` y `DAPTA_WHATSAPP_RESULT_SECRET`. El flujo debe comprobar `x-webhook-secret` en solicitudes entrantes. Usa secretos distintos para entrada y salida.
4. Mapea en el flujo estos campos. `order.phone` es el destinatario, `opening` el primer texto y `confirmed` el texto reservado para una aceptación inequívoca. Conserva `order_id` y `attempt_id` junto a la conversación. Usa `attempt_id` como clave de idempotencia si el flujo ejecuta trabajos con reintentos. Un envío iniciado por la empresa requiere la plantilla aprobada que corresponda en el canal de WhatsApp.
5. Al confirmar o escalar la conversación, envía un POST a `/api/webhooks/dapta/whatsapp` con `x-webhook-secret` igual a `DAPTA_WHATSAPP_RESULT_SECRET` y este cuerpo:

   ```json
   {
     "order_id": "gid://shopify/Order/900000002",
     "attempt_id": "<uuid del intento recibido>",
     "outcome": "confirmed"
   }
   ```

   Usa `human` para cancelaciones, enojo o preguntas que Juliana no pueda resolver. Conserva el contrato `policy` recibido. Define en Dapta el traspaso a una persona y los mensajes permitidos.
6. Haz un pedido de prueba con un número propio. Autorízalo desde la torre y verifica la entrega en WhatsApp, la aceptación y el cambio de estado en la bandeja.

La demo local incluye un pedido sintético que permite revisar el texto desde la interfaz. El botón de autorización solo aparece con la configuración real del flujo.
