import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { strToU8, zipSync } from "fflate"
import { Liquid } from "liquidjs"
import { z } from "zod"

const line = z.string().trim().min(3).max(220).regex(/^[^\x00-\x1f{}<>]+$/)
const price = z.number().int().min(1).max(100_000_000)
const credentialFreeHttps = z.url({ protocol: /^https$/ }).max(400)
  .refine((value) => !new URL(value).username && !new URL(value).password, "Usa fuentes sin credenciales en la URL.")

export const productionBrief = z.object({
  product: line.max(80),
  problem: line,
  benefit: line.max(80),
  facts: z.array(line).min(3).max(5),
  steps: z.tuple([line, line, line]),
  sources: z.array(z.object({ url: credentialFreeHttps, market: z.string().regex(/^[A-Z]{2}$/), observation: line })).min(1).max(8),
  category: z.enum(["general", "cosmetico", "ingerible", "uso_en_piel"]),
  prices: z.tuple([price, price]).rest(price).refine((values) => values.length <= 3),
  unitCost: price,
  fulfillment: z.number().int().min(0).max(100_000_000),
  delivery: line.optional(),
  freeShipping: z.boolean().default(false),
  hasImageRights: z.boolean(),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#805142"),
})
export type ProductionInput = z.input<typeof productionBrief>
export type Photo = { data: Uint8Array }

export class ProductionBlocked extends Error {}

const unsafeCopy = /\b(cura[rs]?|elimina(?:r)? (?:el )?dolor|quema[rs]? grasa|grado médico|clínicamente probado|solo hoy|sólo hoy|últimas? \d+ unidades|[0-9.]+ clientes satisfechos|gratis|garantía|garantizado)\b/i
const templateRoot = join(process.cwd(), "docs", "landing", "plantillas")
const shopifyMoney = new Intl.NumberFormat("es-CO", { useGrouping: "always", maximumFractionDigits: 0 })
const money = (value: number) => "$" + shopifyMoney.format(value)
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character)

function slot(source: string, anchor: RegExp, replacement: string) {
  if (!anchor.test(source)) throw new Error(`Cambió un ancla de la plantilla Liquid: ${anchor.source}`)
  return source.replace(anchor, () => replacement)
}

function photoName(data: Uint8Array, index: number) {
  const bytes = Buffer.from(data)
  const type = bytes.length > 12 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : bytes.length > 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
      : bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null
  if (!type) throw new ProductionBlocked("La galería solo acepta archivos PNG, JPG y WebP.")
  return `imagenes/G${index + 1}.${type}`
}

function makeHero(template: string, brief: z.output<typeof productionBrief>) {
  const { prices } = brief
  const featured = prices.length
  let hero = slot(template, /\{%- comment -%\}[\s\S]*?\{%- endcomment -%\}/, "{%- comment -%} LUMENS · Hero adaptado. Configura Releasit en orden de cantidad: 1, 2 y opcionalmente 3. {%- endcomment -%}")
  hero = slot(hero, /assign lmn_p2 = \d+/, `assign lmn_p2 = ${prices[1] * 100}`)
  hero = slot(hero, /assign lmn_p3 = \d+/, `assign lmn_p3 = ${(prices[2] ?? prices[1]) * 100}`)
  hero = slot(hero, /assign lmn_antes = \d+/, "assign lmn_antes = lmn_p1")
  hero = slot(hero, /assign n = v \| plus: 0 \| divided_by: 100/, "assign n = v | plus: 0 | divided_by: 100 | floor")
  hero = slot(hero, /assign mil = n \| divided_by: 1000/, "assign mil = n | divided_by: 1000 | floor")
  hero = slot(hero, /\$\{\{ mil \}\}\.\{\{ rr \}\}/, `{%- assign million = mil | divided_by: 1000 | floor -%}
    {%- if million > 0 -%}
      {%- assign mid = mil | modulo: 1000 -%}
      {%- if mid < 10 -%}{%- assign mid = mid | prepend: '00' -%}{%- elsif mid < 100 -%}{%- assign mid = mid | prepend: '0' -%}{%- endif -%}
      ${'$'}{{ million }}.{{ mid }}.{{ rr }}
    {%- else -%}${'$'}{{ mil }}.{{ rr }}{%- endif -%}`)
  hero = slot(hero, /<span>🚚.*\n.*\n.*\n.*EMPAQUE DISCRETO.*<\/span>/, `<span>💵 <b>PAGAS AL RECIBIR</b></span>${brief.freeShipping ? "<span>🚚 Envío gratis</span>" : ""}`)
  hero = slot(hero, /<span class="lmn-seal"[^\n]+\n/, "")
  hero = slot(hero, /<p class="lmn-kick">[\s\S]+?<\/ul>/, `<p class="lmn-kick">${escape(brief.product)}</p>
    <h1 class="lmn-h1"><em>${escape(brief.benefit)}</em></h1>
    <ul class="lmn-bul">${brief.facts.slice(0, 3).map((fact) => `<li>${escape(fact)}</li>`).join("")}</ul>`)
  hero = slot(hero, /<p>¿Dudas\? Después[^\n]+<\/p>/, "")
  hero = slot(hero, /id="lmn-qty" value="3"/, `id="lmn-qty" value="${featured}"`)
  hero = slot(hero, /<div class="lmn-offer-banner">[\s\S]*?<div id="lmnCheckoutFormTarget">/, `<div class="lmn-offer-banner"><b>Elige tu pack</b></div>
        <div class="lmn-bundles">${prices.map((_, index) => {
          const qty = index + 1
          const selected = qty === featured
          return `<label class="lmn-bundle-option${selected ? " lmn-star is-selected" : ""}" data-bundle-index="${index}" data-qty="${qty}">
          <span class="lmn-rd"></span><input type="radio" name="bundle" value="${qty}"${selected ? " checked" : ""}>
          <span class="lmn-bi"><b>${qty} ${qty === 1 ? "unidad" : "unidades"}</b></span>
          <span class="lmn-bp"><b>{{ M[${[0, 2, 4][index]}] }}</b></span>
        </label>`
        }).join("")}</div>
        <div id="lmnCheckoutFormTarget">`)
  hero = slot(hero, /Sin tarjeta · Envío gratis/, "Pago contra entrega")
  hero = slot(hero, /<p class="lmn-aviso"[^\n]+<\/p>/, '<p class="lmn-aviso" id="lmnAviso">Esta variante no está disponible. Elige otra antes de continuar.</p>')
  hero = slot(hero, /<p class="lmn-llega"[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n<\/div>/,
    `${brief.delivery ? `<p class="lmn-llega">${escape(brief.delivery)}</p>` : ""}\n</div></div>`)
  hero = slot(hero, /id="lmnStickyPrice">\{\{ M\[4\] \}\}<\/b> <span id="lmnStickyPack">[^<]+/,
    `id="lmnStickyPrice">{{ M[${featured === 3 ? 4 : 2}] }}</b> <span id="lmnStickyPack">· ${featured} unidades`)
  hero = slot(hero, /    \/\/ 2\. FECHA DE ENTREGA[\s\S]*?(?=    \/\/ 2B\.)/, "")
  hero = slot(hero, /var selectedIndex = '2'/, `var selectedIndex = '${featured - 1}'`)
  hero = slot(hero, /if \(stickyPack\) \{ var q = option.getAttribute\('data-qty'\); stickyPack.textContent = [^\n]+/,
    "if (stickyPack) { var q = option.getAttribute('data-qty'); stickyPack.textContent = '· ' + q + (q === '1' ? ' unidad' : ' unidades'); }")
  return hero.replaceAll(/#0E2A47|#1E9BF0|#0E7490/gi, brief.accent).replaceAll("3 camisillas", "3 unidades")
}

function makeBody(template: string, brief: z.output<typeof productionBrief>) {
  const style = template.match(/<style>[\s\S]*?<\/style>/)?.[0]
  const script = template.match(/<script>[\s\S]*?<\/script>/)?.[0]?.replaceAll(/^\s*\/\/.*camisilla.*$/gim, "")
  if (!style || !script) throw new Error("Falta la estructura del cuerpo validado.")
  const button = '<button type="button" class="lm-cta" data-q="sel"><span>Pedir y pagar al recibir</span></button>'
  const media = (index: number, cls = "lm-img") =>
    `{%- if product.media[${index}] -%}<img class="${cls}" src="{{ product.media[${index}] | image_url: width: 1000 }}" alt="${escape(brief.product)}" loading="lazy" width="1000" height="1000">{%- endif -%}`
  const section = (theme: string, html: string, id = "") =>
    `<section class="lm-sec ${theme}"${id ? ` id="${id}"` : ""}><div class="lm-w">${html}</div></section>`
  const packs = brief.prices.map((amount, index) => {
    const qty = index + 1
    const selected = qty === brief.prices.length
    return `<div class="lm-of${selected ? " star on" : ""}" data-plan="${qty}" role="button" tabindex="0" aria-pressed="${selected}">
      <span class="rd"></span><span class="qn"><b>${qty} ${qty === 1 ? "unidad" : "unidades"}</b></span>
      <span class="cu"><b>${money(amount)}</b></span></div>`
  }).reverse().join("")
  return `${style.replaceAll(/#0E2A47|#1E9BF0|#0E7490/gi, brief.accent)}
<div class="lm" id="lmLanding">
${section("t", `<p class="lm-k">¿Te pasa?</p><h2 class="lm-h">${escape(brief.problem)}</h2>${button}`)}
${section("o", `<h2 class="lm-h">Lo que incluye ${escape(brief.product)}</h2>${media(1)}
  <ul class="lm-bl">${brief.facts.map((fact) => `<li><div><b>${escape(fact)}</b></div></li>`).join("")}</ul>`)}
${section("", `<h2 class="lm-h">Así de fácil</h2><div class="lm-pasos">
  ${brief.steps.map((step, i) => `<figure class="lm-paso">${media(i + 1)}<b>${i + 1}</b><figcaption>${escape(step)}</figcaption></figure>`).join("")}</div>`)}
${section("t", `<h2 class="lm-h">Elige tu pack</h2><div class="lm-planes">${packs}</div>${button}
  <div class="lm-sellos"><span>Pagas al recibir</span>${brief.freeShipping ? "<span>Envío gratis</span>" : ""}</div>`, "lmPacks")}
${section("", `<h2 class="lm-h">Preguntas frecuentes</h2><div class="lm-faq">
   <details><summary>¿Cómo pago?</summary><p>Pagas al recibir tu pedido.</p></details>
   <details><summary>¿Qué cantidades puedo pedir?</summary><p>Elige entre ${brief.prices.length} packs. El precio de cada opción aparece arriba.</p></details>
   ${brief.delivery ? `<details><summary>¿Cuál es el plazo de entrega?</summary><p>${escape(brief.delivery)}</p></details>` : ""}
 </div>`)}
${section("o", `${media(3, "lm-cierre-img")}<h2 class="lm-h"><em>${escape(brief.benefit)}</em></h2>${button}`)}
<footer class="lm-pie"><div class="lm-w"><nav><a href="/policies/refund-policy">Cambios y devoluciones</a><a href="/policies/shipping-policy">Envíos</a><a href="/policies/privacy-policy">Privacidad</a></nav><strong>LUMENS</strong></div></footer>
</div>
${slot(script, /var selectedQty = '3'/, `var selectedQty = '${brief.prices.length}'`)}`
}

export async function runProduction(input: unknown, photos: Photo[], demo = false) {
  const parsed = productionBrief.safeParse(input)
  if (!parsed.success) throw new ProductionBlocked(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · "))
  const brief = parsed.data
  if (brief.category !== "general") throw new ProductionBlocked("2C · Se requiere revisión humana de INVIMA antes de generar Liquid para esta categoría.")
  if (!brief.hasImageRights) throw new ProductionBlocked("2C · Confirma que tienes autorización para usar las imágenes.")
  if ([brief.product, brief.problem, brief.benefit, ...brief.facts, ...brief.steps, brief.delivery ?? ""].some((value) => unsafeCopy.test(value))) {
    throw new ProductionBlocked("2C · El brief contiene promesas, urgencia o prueba social que requieren revisión.")
  }
  const packs = brief.prices.map((price, index) => ({
    units: index + 1, price, contribution: price - brief.unitCost * (index + 1) - brief.fulfillment,
  }))
  if (packs.some(({contribution}) => contribution <= 0)) throw new ProductionBlocked("2B · Al menos un pack queda sin contribución antes de pauta.")
  if (brief.prices.some((price, i) => i > 0 && price <= brief.prices[i - 1])) throw new ProductionBlocked("3A · El precio total debe aumentar con la cantidad.")
  if (photos.length < 1 || photos.length > 7 || photos.reduce((sum, photo) => sum + photo.data.length, 0) > 3_500_000) {
    throw new ProductionBlocked("4B · Adjunta entre 1 y 7 fotos que sumen menos de 3,5 MB.")
  }
  const gallery = photos.map(({ data }, index) => ({ name: photoName(data, index), data }))
  const [heroTemplate, bodyTemplate] = await Promise.all([
    readFile(join(templateRoot, "simple-1-hero.liquid"), "utf8"),
    readFile(join(templateRoot, "simple-2-cuerpo.liquid"), "utf8"),
  ])
  const hero = makeHero(heroTemplate, brief)
  const body = makeBody(bodyTemplate, brief)
  const blockSizes = [Buffer.byteLength(hero), Buffer.byteLength(body)]
  if (blockSizes.some((size) => size >= 50_000)) throw new ProductionBlocked("5B · Un bloque supera el límite de Shopify.")
  if (/3ra gratis|lleva 3, paga 2|1\/0671\/0598\/0521/i.test(hero + body)) throw new ProductionBlocked("5B · Quedó texto del producto de la plantilla; revisa la adaptación.")

  const engine = new Liquid({ strictFilters: true, cache: false })
  engine.registerFilter("image_url", (media: { src?: string }) => media.src ?? "")
  engine.registerFilter("placeholder_svg_tag", () => "")
  const context = { product: {
    title: brief.product, price: brief.prices[0] * 100, compare_at_price: 0, has_only_default_variant: true,
    selected_or_first_available_variant: { id: 1 }, media: gallery.map(({ name }) => ({ src: name, alt: brief.product })),
  } }
  const preview = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(brief.product)} · Vista previa</title><body><p style="margin:0;padding:10px;font:600 13px system-ui;background:#f3e4cb;color:#33231a">
Vista previa · checkout desactivado${demo ? " · producto e imágenes de demostración" : ""}</p>${
    (await engine.parseAndRender(hero, context)).replace('action="/cart/add"', 'action="#lmnCheckoutFormTarget"')
  }${await engine.parseAndRender(body, context)}</body></html>`
  if (!preview.includes("imagenes/G1.") || !preview.includes("lmnCheckoutFormTarget")) throw new ProductionBlocked("5B · La galería o el ancla de compra no se renderizaron.")

  const hasLocalEvidence = brief.sources.some((source) => source.market === "CO")
  const stages = [
    { code: "0", status: "borrador", detail: "Expediente y entrega preparados para revisión humana." },
    { code: "1A", status: "borrador", detail: `${brief.sources.length} fuentes aportadas. Sin consulta externa automática.` },
    { code: "1B", status: hasLocalEvidence ? "borrador" : "pendiente", detail: hasLocalEvidence ? "Fuentes de Colombia registradas." : "Falta evidencia colombiana." },
    { code: "1C", status: "pendiente", detail: "Requiere histórico para afirmar una tendencia." },
    { code: "2A", status: "pendiente", detail: "Revisar fuentes e hipótesis de demanda con el dueño." },
    { code: "2B", status: "borrador", detail: "Contribución calculada. Verificar costo, stock y proveedor." },
    { code: "2C", status: "borrador", detail: "Filtro inicial de promesas y derechos declarado. Revisión humana pendiente." },
    { code: "3A", status: "borrador", detail: `${packs.length} packs con contribución positiva.` },
    { code: "3B", status: "completado", detail: "Liquid, CSS y vista previa generados a partir de la plantilla simple." },
    { code: "4A", status: "borrador", detail: "Titular, beneficios y CTA armados con el brief." },
    { code: "4B", status: "completado", detail: `${gallery.length} imágenes en el ZIP y prompts de galería.` },
    { code: "5A", status: "borrador", detail: "Ángulo creativo sin cuenta publicitaria conectada." },
    { code: "5B", status: "pendiente", detail: "Validación estática aprobada. Falta checkout real de Releasit." },
    { code: "6A", status: "pendiente", detail: "Se activa al recibir un pedido y autorizar WhatsApp." },
    { code: "6B", status: "pendiente", detail: "Requiere un pedido enviado y datos de la transportadora." },
    { code: "6C", status: "pendiente", detail: "Requiere entrega confirmada y permiso del comprador." },
    { code: "7A", status: "pendiente", detail: "Requiere resultados reales de pauta." },
    { code: "7B", status: "pendiente", detail: "Requiere registros de cobro, entrega, gastos y devoluciones." },
  ]
  const prompt = `Producto: ${brief.product}\nProblema: ${brief.problem}\nUsa fotos autorizadas como referencia. Conserva material, color y proporciones. No agregues resultados, etiquetas ni garantías.\n` +
    gallery.map(({ name }, index) => `${name}: ${["Portada", "Detalle", "Uso contextual", "Vista alternativa"][index] ?? "Variante autorizada"}`).join("\n")
  const checklist = `# Entrega LUMENS · ${brief.product}
${demo ? "\nProducto ficticio e imágenes de demostración.\n" : ""}
- Abre vista-previa.html desde la carpeta extraída.
- Sube las fotos de imagenes/ a la galería del producto en el mismo orden.
- Pega 1-producto.txt y 2-landing.txt en bloques de Liquid personalizado de un tema duplicado.
- En Shopify, configura 1 unidad en ${money(brief.prices[0])}. En Releasit conserva el orden 1 → 2${packs.length === 3 ? " → 3" : ""}.
${packs.map(({units, price, contribution}) => `- Pack ${units}: ${money(price)} COP. Contribución estimada antes de pauta: ${money(contribution)} COP.`).join("\n")}
- En la vista privada de Shopify, prueba cada pack, cada variante, el CTA y que Releasit muestre el total correcto.
- Verifica fuentes, costos, stock, permisos y política de entrega antes de publicar.
`
  const files = {
    "1-producto.txt": strToU8(hero), "2-landing.txt": strToU8(body),
    "vista-previa.html": strToU8(preview), "LEEME.md": strToU8(checklist),
    "prompts.txt": strToU8(prompt),
    "borrador-campana.md": strToU8(`# Borrador · ${brief.product}\n\nÁngulo: ${brief.problem} → ${brief.benefit}\n\nCTA: Elige tu pack y paga al recibir.\n`),
    "informe.json": strToU8(JSON.stringify({ demo, packs, blockSizes, sources: brief.sources, stages }, null, 2)),
    ...Object.fromEntries(gallery.map(({name,data}) => [name,data])),
  }
  return { zip: zipSync(files, { level: 5 }), packs, stages, blockSizes }
}
