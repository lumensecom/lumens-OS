-- LUMENS OS · Seed inicial
-- Ejecutar DESPUÉS de todas las migraciones.

-- ── Productos ──────────────────────────────────────────────────────────────
-- (selling_price y cost_dropi son NOT NULL: los productos sin precio definido
--  se siembran con 0 como placeholder mientras están en 'testing'.)
insert into products (name, slug, status, selling_price, compared_price, cost_dropi, shipping_cost, landing_url, best_angle, target_audience) values
('Cinturón Masajeador Anticólicos Alivio Pro', 'alivio-pro-lumens', 'active', 69900, 109900, 37900, 0, '/products/alivio-pro-lumens', 'Hombres regalando: Mi novio no es el típico tómate algo', 'Mujeres 18-40 con dolor menstrual'),
('Combo Ritual Colágeno Día de la Madre', 'combo-ritual-colageno', 'paused', 119900, 149900, 95847, 0, '/products/combo-ritual-colageno', 'Día de la Madre - regalo emocional', 'Hombres 25-45 regalando a mamás'),
('VigiPro Cámara WiFi 3 Antenas', 'vigipro-camara-wifi', 'testing', 109900, null, 43000, 0, null, null, 'Familias con casa/negocio'),
('Mini Proyector LED HD', 'mini-proyector-led', 'testing', 89900, null, 42900, 0, null, null, 'Jóvenes 18-30 amantes del cine'),
('Tira LED RGB 10M', 'tira-led-rgb-10m', 'testing', 59900, null, 33500, 0, null, null, 'Jóvenes 15-25 decorando cuarto'),
('Aspiradora Robot', 'aspiradora-robot', 'testing', 0, null, 0, 0, null, null, 'Amas de casa 30-55')
on conflict (slug) do nothing;

-- ── Categorías de conocimiento ─────────────────────────────────────────────
insert into knowledge_categories (name, slug, icon, color, order_index) values
('Procesos operativos', 'procesos-operativos', 'workflow', '#F5C518', 1),
('Investigación de productos', 'investigacion-productos', 'search', '#7C3AED', 2),
('Cómo crear landings', 'crear-landings', 'layout', '#22a55b', 3),
('Cómo crear creativos', 'crear-creativos', 'video', '#ef4444', 4),
('Cómo escalar campañas', 'escalar-campanas', 'trending-up', '#3b82f6', 5),
('Ángulos y hooks validados', 'angulos-hooks', 'target', '#f97316', 6),
('Gestión de devoluciones', 'gestion-devoluciones', 'refresh-cw', '#ec4899', 7),
('Herramientas y plantillas', 'herramientas-plantillas', 'wrench', '#14b8a6', 8)
on conflict (slug) do nothing;

-- ── Artículos iniciales ────────────────────────────────────────────────────
insert into knowledge_articles (category_id, title, slug, content, tags, is_pinned) values
(
  (select id from knowledge_categories where slug = 'investigacion-productos'),
  'Cómo hacer research de productos',
  'como-hacer-research-de-productos',
  E'# Cómo hacer research de productos\n\nEl research es el 80% del resultado. Un buen producto perdona errores de ejecución; uno malo no se salva con nada.\n\n## Los 5 criterios LUMENS (0-10 cada uno)\n\n1. **Margen** — ¿El precio de venta menos el costo Dropi y envío deja margen para pagar un CPA rentable? Buscamos margen > 50%.\n2. **Demanda** — ¿Hay competidores corriendo anuncios activos hace semanas? Anuncios que llevan mucho tiempo = está funcionando.\n3. **Visual** — ¿Se entiende el beneficio en los primeros 3 segundos de video? Si no es obvio, es difícil de vender en PCE.\n4. **Logística** — ¿Está disponible en Dropi con buena cobertura nacional? Sin stock no hay negocio.\n5. **Competencia** — ¿Está saturado o hay hueco? Preferimos productos con demanda probada pero no quemados.\n\n## Dónde buscar\n\n- **Meta Ads Library** — filtra por Colombia y mira qué lleva tiempo corriendo.\n- **TikTok** — busca sonidos y hashtags de producto viral.\n- **AliExpress / Amazon** — valida costo y disponibilidad.\n\n## Flujo\n\n1. Descubre 10 candidatos por semana.\n2. Puntúa cada uno con los 5 criterios.\n3. Los de score > 35/50 pasan a testing.\n4. Documenta referencias (anuncios, tiendas, videos) en el módulo de Research.',
  array['research', 'productos', 'criterios'],
  true
),
(
  (select id from knowledge_categories where slug = 'crear-landings'),
  'Estructura de landing que convierte',
  'estructura-de-landing-que-convierte',
  E'# Estructura de landing que convierte\n\nEn PCE la landing tiene que cerrar la venta sola. El orden importa.\n\n## Secciones en orden\n\n1. **Hero** — Foto de producto + promesa clara + CTA de pago contra entrega arriba.\n2. **Problema** — Agita el dolor que resuelve el producto.\n3. **Solución** — Cómo el producto elimina ese dolor, con imágenes reales.\n4. **Prueba social** — Reseñas, testimonios, capturas de WhatsApp.\n5. **Beneficios** — Bullets cortos, uno por línea.\n6. **Oferta** — Precio tachado, precio actual, urgencia real.\n7. **Garantía** — Pago contra entrega = cero riesgo para el cliente.\n8. **FAQ** — Resuelve las 5 objeciones más comunes.\n9. **CTA final** — Formulario simple: nombre, teléfono, dirección, ciudad.\n\n## Reglas\n\n- Un solo CTA repetido, nunca compitiendo.\n- Móvil primero: el 95% del tráfico es celular.\n- Carga rápida: comprime imágenes.',
  array['landings', 'conversion', 'pce'],
  false
),
(
  (select id from knowledge_categories where slug = 'angulos-hooks'),
  'Los 6 ángulos ganadores en Colombia',
  'los-6-angulos-ganadores-en-colombia',
  E'# Los 6 ángulos ganadores en Colombia\n\nUn ángulo es el porqué emocional detrás de la compra. El producto es el mismo; el ángulo cambia a quién le habla.\n\n## Los 6 ángulos\n\n1. **Hombre regalando** — "Mi novio no es el típico que dice tómate algo". El hombre queda como héroe.\n2. **Dolor directo** — Habla del problema físico/emocional sin rodeos y muestra el alivio.\n3. **Regalo emocional** — Día de la Madre, aniversario, cumpleaños. La emoción vende.\n4. **Antes y después** — Transformación visible y creíble.\n5. **Miedo / seguridad** — Protege tu casa, tu familia, tu negocio.\n6. **Estatus / pertenencia** — "Todos ya lo tienen", decoración, tendencia.\n\n## Cómo usarlos\n\n- Un mismo producto puede tener 3-4 ángulos distintos.\n- Testea un ángulo por creativo, no mezcles.\n- El hook (primeros 3 segundos) debe gritar el ángulo.',
  array['angulos', 'hooks', 'creativos'],
  true
)
on conflict (slug) do nothing;
