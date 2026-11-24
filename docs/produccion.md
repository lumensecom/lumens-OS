# Producción de landings

En la Torre, abre **Producción**. Elige una prueba o genera una entrega con el nombre, precio unitario y al menos una foto autorizada. Agrega datos, costos y fuentes cuando estén disponibles. Cada ficha de agente incluye su responsabilidad. El módulo lista el recorrido de las 18 oficinas y el ZIP registra qué etapas quedaron como borrador, completadas o pendientes.

El agente 3B ofrece tres estructuras validadas: corta de Vestido Pádel para moda o accesorios, explicativa de Ionfit y completa de Chaleco V-Boost. Las [instrucciones del agente](landing/agente-3b.md) también se pueden consultar en su oficina. Para arrancar, indica el producto, un precio y al menos una foto autorizada. Los costos, variantes y medios faltantes aparecen como pendientes en el informe. Empaqueta los dos bloques Liquid, la galería, la vista previa HTML, los prompts, la oferta con margen por pack, un borrador de campaña y el informe JSON. El ZIP contiene los archivos de imagen reales que entraron al flujo. El ejemplo contiene cuatro imágenes generadas para un producto ficticio.

En una oportunidad aprobada, **Landing Studio → Generar archivos con el agente 3B** recupera el producto, problema, costos y pack evaluado. Adjunta las fotos y completa los precios que falten. **Generar y enviar al Lobby** descarga el ZIP y registra los dos bloques como versión pendiente. Tras la aprobación en el Lobby, se pueden descargar desde la ficha del producto.

Los resultados dependen de hechos y medios aportados. La revisión sanitaria, la verificación independiente de las fuentes, la generación de nuevas fotos de un producto real, Shopify, Releasit, los anuncios y el contacto con clientes requieren sus propios datos y pruebas. El generador prepara un borrador y no publica ni contacta automáticamente.

## Enterizo Milán

En **Torre → Producción → Probar Enterizo Milán** se genera la entrega del caso con un precio de $149.900 COP. La galería contiene tres imágenes ilustrativas del modelo negro. La tabla de tallas, los precios de packs, los plazos y los testimonios se reservan para información propia verificada.

[Descargar la prueba de Enterizo Milán](../downloads/LUMENS-Enterizo-Milan.zip)

## Pruebas

`pnpm test:production` ejecuta las pruebas de las entregas y llamadas. Las 55 pruebas de landings cubren los controles y los tres formatos. Incluyen el caso del Enterizo Milán, Liquid en ambos bloques, orden y consistencia de precios, medios opcionales y el informe de las 18 oficinas. GitHub Actions ejecuta esta suite antes del build.

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
| 3B | Landing Shopify | Elige la plantilla corta, explicativa o completa. Adapta dos bloques Liquid, conserva la conexión con Releasit y entrega galería, prompts y control de calidad. |
| 4A | Estrategia creativa | Organiza el ángulo problema → solución y redacta el titular, beneficios y pasos a partir del brief. |
| 4B | Prompts visuales | Entrega las fotos autorizadas y prompts para mantener apariencia, material y colores reales. |
| 5A | Borradores de campaña | Deja un borrador de ángulo, CTA y creatividades para revisión del dueño. |
| 5B | QA de lanzamiento | Valida los tamaños, la vista previa, el flujo de packs y restos de plantilla. Deja pendiente la prueba real del checkout. |
| 6A | Confirmación de pedidos | Revisa pedidos de Shopify y asigna el primer contacto a Juliana tras autorización. |
| 6B | Novedades y logística | Identifica pedidos con novedad o retiro pendiente, y deriva los que requieren contacto. |
| 6C | Reseñas reales | Pide y registra el permiso para usar reseñas de compradores con entrega confirmada. |
| 7A | Analítica de pauta | Resume gasto, conversiones y CPA de las campañas registradas con fecha y fuente. |
| 7B | Utilidad real | Concilia ingresos cobrados, costos, devoluciones y pauta a partir de datos reales. |
