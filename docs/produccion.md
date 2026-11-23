# Producción de landings

En la Torre, abre **Producción**. Puedes descargar la entrega de demostración o generar una con el problema, los hechos del producto, los costos, los precios, una fuente y las fotos autorizadas. Cada ficha de agente incluye su responsabilidad. El módulo lista el recorrido de las 18 oficinas y el ZIP registra qué etapas quedaron como borrador, completadas o pendientes.

El generador deriva el hero y el cuerpo de la plantilla simple de Ionfit. Empaqueta los dos bloques Liquid, la galería, la vista previa HTML, los prompts, la oferta con margen por pack, un borrador de campaña y el informe JSON. El ZIP contiene los archivos de imagen reales que entraron al flujo. El ejemplo contiene cuatro imágenes generadas para un producto ficticio.

Los resultados dependen de hechos y medios aportados. La revisión sanitaria, la verificación independiente de las fuentes, la generación de nuevas fotos de un producto real, Shopify, Releasit, los anuncios y el contacto con clientes requieren sus propios datos y pruebas. El generador prepara un borrador y no publica ni contacta automáticamente.

## Pruebas

`pnpm test:production` ejecuta 50 pruebas con medios reales de demostración. Treinta generan y abren el ZIP para verificar artefactos y las 18 oficinas. Veinte cubren bloqueos por evidencia, derechos, cumplimiento, formato y contribución. GitHub Actions ejecuta esta suite antes del build.

Puedes generar el ZIP desde la raíz del repositorio con Node 24:

```sh
node tools/production/generate.mjs lib/production/demo/brief.json entrega-demo.zip lib/production/demo/G{1,2,3,4}.webp
```

[Descargar la entrega de demostración](../downloads/LUMENS-Produccion-Demo.zip)

## Responsabilidades por oficina

| Código | Oficina | Trabajo |
| --- | --- | --- |
| 0 | Dirección de operaciones | Recibe problema, producto y oferta. Registra bloqueos y entrega la bitácora del paquete. |
| 1A | Radar internacional | Separa el problema de la solución y organiza fuentes internacionales aportadas. |
| 1B | Radar Colombia | Etiqueta evidencia de Colombia, competidores, disponibilidad y saturación. Reporta ausencia de fuentes locales. |
| 1C | Radar de tendencias | Documenta fecha y mercado de las señales. Requiere histórico antes de afirmar que una tendencia sube. |
| 2A | Validador de demanda | Reúne problemáticas observadas y fuentes locales para validación del dueño. No confunde interés con ventas. |
| 2B | Rentabilidad y proveedor | Comprueba costo unitario, logística y contribución por pack. Deja stock y proveedor pendientes si faltan datos. |
| 2C | Cumplimiento | Verifica autorización de fotos y filtra promesas riesgosas. Escala revisión sanitaria y evidencia insuficiente. |
| 3A | Oferta y precio | Verifica precios, contribución y orden de las ofertas. Destaca el pack de mayor cantidad disponible. |
| 3B | Landing Shopify | Adapta el hero y el cuerpo de Ionfit, conserva las conexiones de Releasit y prepara la vista previa. |
| 4A | Estrategia creativa | Organiza el ángulo problema → solución y redacta el titular, beneficios y pasos a partir del brief. |
| 4B | Prompts visuales | Entrega las fotos autorizadas y prompts para mantener apariencia, material y colores reales. |
| 5A | Borradores de campaña | Deja un borrador de ángulo, CTA y creatividades para revisión del dueño. |
| 5B | QA de lanzamiento | Valida los tamaños, la vista previa, el flujo de packs y restos de plantilla. Deja pendiente la prueba real del checkout. |
| 6A | Confirmación de pedidos | Revisa pedidos de Shopify y asigna el primer contacto a Juliana tras autorización. |
| 6B | Novedades y logística | Identifica pedidos con novedad o retiro pendiente, y deriva los que requieren contacto. |
| 6C | Reseñas reales | Pide y registra el permiso para usar reseñas de compradores con entrega confirmada. |
| 7A | Analítica de pauta | Resume gasto, conversiones y CPA de las campañas registradas con fecha y fuente. |
| 7B | Utilidad real | Concilia ingresos cobrados, costos, devoluciones y pauta a partir de datos reales. |
