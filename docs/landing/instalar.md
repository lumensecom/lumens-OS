# Pegarla en Shopify (tema Horizon)

## 1 · El producto
**Productos →** abre o crea el producto:
- **Fotos** en este orden (las 6 imágenes de la skill): 1 hero, 2 en uso, 3 comparativa o antes y
  después, 4 infografía de beneficios (sale también en «Por qué lo repiten»), 5 cómo se usa, 6 qué trae.
- **Precio** y **Precio de comparación**: los dos primeros números que imprime el script.
- Videos de «Así se usa»: **Contenido → Archivos → Subir**, copia el enlace `.mp4` → `videos`.

## 2 · La plantilla
1. **Tienda online → Temas → Personalizar**, en el **tema publicado**.
2. **Productos → Crear plantilla**, con el nombre del producto.
3. **Oculta** «Información del producto» y las demás secciones de producto del tema.
4. Agrega **2 secciones «Liquid personalizado»**, en orden:
   1. `1-producto.txt`  (barra, galería, precio, ofertas, botón, entrega, barra fija)
   2. `2-landing.txt`   (todo lo demás y el footer)

   Si prefieres un solo bloque, pega `pagina-completa.txt`. Si no guarda (pasa de ~45 KB),
   vuelve a los dos.
5. **Guardar.** Si el tema ya tiene footer propio y sale doble, arma con `"footer": false`.

## 3 · Asignarla
Producto (admin) → **Plantilla de tema** → la nueva → Guardar.

## 4 · Releasit
- Releasit **activo en la página de producto**. El bloque 1 trae el formulario de Shopify
  (`#lmForm`); Releasit mete ahí su botón, la página lo esconde **solo ahí** y lo pulsa desde
  todos sus botones. No ocultes la clase de Releasit en todo el sitio.
- **Ofertas de cantidad** en este orden: 1 unidad, 2 unidades (y 3), con los precios del script.
  La página marca la oferta por posición (`data-offer-pos` 0, 1, 2).
- Envío prioritario: upsell **no preseleccionado**. Precios del formulario = precios de la página.

## 5 · Revisar en el celular antes de pautar
- Fotos, miniaturas, contador «1 / 6», precio, tachado y «Ahorras $X · Y% OFF».
- Las fechas de entrega muestran el día de hoy.
- Botón de arriba → formulario con 1 unidad. Tocar «2» y el botón → formulario con 2.
- En «Elige tu pack», tocar una tarjeta abre el formulario con esa cantidad.
- La barra fija aparece al pasar el botón principal y no tapa el footer.

## Si cambia el precio
El de 1 unidad, el tachado y el ahorro salen de Shopify solos. Los de 2 y 3 van escritos en los
dos bloques: vuelve a correr el script, pega los dos y actualiza Releasit.
