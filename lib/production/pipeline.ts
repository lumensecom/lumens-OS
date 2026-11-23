import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { strToU8, zipSync } from "fflate"
import { Liquid } from "liquidjs"
import { z } from "zod"

const line = z.string().trim().min(3).max(220).regex(/^[^\x00-\x1f{}<>]+$/)
const price = z.number().int().min(1).max(100_000_000)
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
const shopifyAsset = z.url({ protocol: /^https$/, hostname: /^cdn\.shopify\.com$/ }).max(400)
  .regex(/^https:\/\/cdn\.shopify\.com\/[a-z0-9_./%?=+&~-]+$/i)
const credentialFreeHttps = z.url({ protocol: /^https$/ }).max(400)
  .refine((value) => !new URL(value).username && !new URL(value).password, "Usa fuentes sin credenciales en la URL.")

export const productionBrief = z.object({
  product: line.max(80),
  problem: line.optional(),
  benefit: line.max(80).optional(),
  audience: line.optional(),
  reference: line.optional(),
  garment: line.optional(),
  facts: z.array(line).max(5).default([]),
  steps: z.tuple([line, line, line]).optional(),
  template: z.enum(["corta", "simple", "completa"]).optional(),
  sizeGuide: shopifyAsset.optional(),
  oneSize: z.boolean().default(false),
  warranty: z.boolean().default(false),
  gift: line.optional(),
  media: z.object({
    videos: z.array(shopifyAsset).max(4).default([]),
    before: shopifyAsset.optional(), after: shopifyAsset.optional(),
    detail: shopifyAsset.optional(), close: shopifyAsset.optional(),
    info: shopifyAsset.optional(), gift: shopifyAsset.optional(),
    lifestyle: z.array(shopifyAsset).max(6).default([]),
    steps: z.array(shopifyAsset).max(3).default([]),
  }).optional(),
  illustrative: z.boolean().default(false),
  sources: z.array(z.object({ url: credentialFreeHttps, market: z.string().regex(/^[A-Z]{2}$/), observation: line })).max(8).default([]),
  category: z.enum(["general", "cosmetico", "ingerible", "uso_en_piel"]),
  prices: z.array(price).min(1).max(3),
  unitCost: price.optional(),
  fulfillment: z.number().int().min(0).max(100_000_000).optional(),
  delivery: line.optional(),
  freeShipping: z.boolean().default(false),
  hasImageRights: z.boolean(),
  accent: color.default("#805142"),
  highlight: color.optional(),
})
export type ProductionInput = z.input<typeof productionBrief>
export type Photo = { data: Uint8Array }
type Brief = z.output<typeof productionBrief> & { problem: string; benefit: string; template: "corta" | "simple" | "completa" }
const priceSlots = [0, 2, 4]
const templateLabels = { corta: "Simple corta · Vestido Pádel", simple: "Simple explicativa · Ionfit", completa: "Completa · Chaleco V-Boost" }
const units = (quantity: number) => quantity === 1 ? "1 unidad" : `${quantity} unidades`

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

function palette(template: string, brief: Brief) {
  const accent = brief.accent
  const highlight = brief.highlight ?? accent
  const rgb = (hex: string) => (hex.slice(1).match(/../g) ?? []).map((value) => parseInt(value, 16)).join(",")
  return template
    .replaceAll(/#0E2A47|#2A1A22|#061626|#1A0F14/gi, accent)
    .replaceAll(/#1E9BF0|#0E7490|#D6336C|#B0234F/gi, highlight)
    .replaceAll(/#EEF4FA|#FBF0F4|#EAF0F6|#FFF0F5|#f1e3e8|#EBD7DF/gi, "color-mix(in srgb, white 94%, " + highlight + ")")
    .replaceAll(/14, ?42, ?71|42, ?26, ?34|6, ?22, ?38|26, ?15, ?20/g, rgb(accent))
    .replaceAll(/30, ?155, ?240|214, ?51, ?108/g, rgb(highlight))
}

function makeHero(template: string, brief: Brief) {
  const { prices } = brief
  const featured = prices.length
  const short = brief.template === "corta"
  const complete = brief.template === "completa"
  const trust = [
    "Pagas al recibir", brief.freeShipping ? "Envío gratis" : "",
    brief.warranty ? "Cambios en 30 días" : "", brief.oneSize ? "Talla única" : "",
    ...brief.facts.slice(0, 2),
  ].filter(Boolean)
  const announcements = trust.slice(0, 4).map((item) => `<span><b>${escape(item)}</b></span>`).join("")
  const sizeButton = brief.sizeGuide ? '<button type="button" class="lmn-guia-btn" id="lmnGuiaBtn">Guía de tallas</button>' : ""
  const facts = brief.facts.slice(0, 3)
  const title = `<p class="lmn-kick">${escape(brief.product)}</p>
    <h1 class="${complete ? "lmn-heading" : "lmn-h1"}"><em>${escape(brief.benefit)}</em></h1>
    ${facts.length ? short || complete ? `<p class="lmn-sub">${facts.map(escape).join(" · ")}</p>` : `<ul class="lmn-bul">${facts.map((fact) => `<li>${escape(fact)}</li>`).join("")}</ul>` : ""}`
  let hero = slot(template, /\{%- comment -%\}[\s\S]*?\{%- endcomment -%\}/, "{%- comment -%} LUMENS · Hero adaptado. Configura Releasit en orden de cantidad: 1, 2 y opcionalmente 3. {%- endcomment -%}")
  hero = slot(hero, /assign lmn_p2 = \d+/, `assign lmn_p2 = ${(prices[1] ?? prices[0]) * 100}`)
  hero = slot(hero, /assign lmn_p3 = \d+/, `assign lmn_p3 = ${(prices[2] ?? prices[1] ?? prices[0]) * 100}`)
  hero = slot(hero, /\{%- assign lmn_antes = product\.compare_at_price[^\n]+\n[^\n]+endif -%\}/, "{%- assign lmn_antes = lmn_p1 -%}")
  if (complete) {
    hero = slot(hero, /<span>🚚[\s\S]+?(?=\n    <\/div>)/, announcements)
    hero = slot(hero, /<div class="lmn-seal"[\s\S]+?<\/div>/, brief.warranty ? '<div class="lmn-seal"><span class="lmn-seal-top">CAMBIOS</span><span class="lmn-seal-big">30</span><span class="lmn-seal-bot">DÍAS</span></div>' : "")
    hero = slot(hero, /<div class="lmn-top-bar">[\s\S]+?(?=<!-- TALLA Y COLOR)/, `<div class="lmn-header-group">${title}</div>`)
    hero = slot(hero, /<div class="lmn-trust-icons-row">[\s\S]+?(?=\n      <\/form>)/, "")
    hero = slot(hero, /<div class="lmn-feature-pills">[\s\S]+?(?=\n  <\/div>\n<\/div>\n\n<!-- BARRA FIJA)/, "")
  } else {
    hero = slot(hero, /<span>🚚[\s\S]+?(?=\n    <\/div>)/, announcements)
    hero = slot(hero, /<span class="lmn-seal"[^\n]+\n/, brief.warranty ? '<span class="lmn-seal" aria-hidden="true"><small>CAMBIO</small>30<small>DÍAS</small></span>' : "")
    hero = slot(hero, /<p class="lmn-kick">[\s\S]+?(?:<\/ul>|<p class="lmn-sub">[^\n]+<\/p>)/, title)
    hero = slot(hero, /<button type="button" class="lmn-guia-btn"[^<]+<\/button>/, "")
    hero = slot(hero, /<div class="lmn-guia" id="lmnGuia" hidden>[\s\S]+?(?=<div class="lmn-checkout-wrapper">)/,
      brief.sizeGuide ? `${sizeButton}<div class="lmn-guia" id="lmnGuia" hidden><img src="${escape(brief.sizeGuide)}" alt="Guía de tallas del proveedor" loading="lazy"></div>` : "")
    if (short && !brief.oneSize) hero = slot(hero, /\{%- if lmn_on contains 'col' -%\}<span class="lmn-unica">[^<]+<\/span>\{%- endif -%\}/, "")
  }
  hero = slot(hero, /assign n = v \| plus: 0 \| divided_by: 100/, "assign n = v | plus: 0 | divided_by: 100 | floor")
  hero = slot(hero, /assign mil = n \| divided_by: 1000/, "assign mil = n | divided_by: 1000 | floor")
  hero = slot(hero, /\$\{\{ mil \}\}\.\{\{ rr \}\}/, `{%- assign million = mil | divided_by: 1000 | floor -%}
    {%- if million > 0 -%}
      {%- assign mid = mil | modulo: 1000 -%}
      {%- if mid < 10 -%}{%- assign mid = mid | prepend: '00' -%}{%- elsif mid < 100 -%}{%- assign mid = mid | prepend: '0' -%}{%- endif -%}
      ${'$'}{{ million }}.{{ mid }}.{{ rr }}
    {%- else -%}${'$'}{{ mil }}.{{ rr }}{%- endif -%}`)
  const offerCards = prices.map((amount, index) => {
    const qty = index + 1
    const selected = qty === featured
    const free = qty === 3 && amount < 3 * prices[0] && amount === prices[1]
    const savings = qty > 1 && amount < prices[0] * qty
    const display = free ? "2 + 1 gratis" : units(qty)
    const price = `{{ M[${priceSlots[index]}] }}`
    const compare = savings ? `<s>{{ M[${priceSlots[index] + 1}] }}</s>` : ""
    const perUnitSlot = complete ? qty + 7 : qty + 4
    const each = qty > 1 ? `<small>{{ M[${perUnitSlot}] }} c/u</small>` : ""
    const radio = `<input type="radio" name="bundle" value="${qty}"${selected ? " checked" : ""}>`
    return `<label class="lmn-bundle-option${selected ? " lmn-star is-selected" : ""}" data-bundle-index="${index}" data-qty="${qty}">
      ${complete
        ? `<div class="lmn-radio-custom"></div>${radio}<div class="lmn-bundle-content"><div class="lmn-bundle-info"><span class="lmn-bundle-name">${display}</span>${each}</div><div class="lmn-bundle-price lmn-bp"><b class="lmn-price-current">${price}</b>${compare}</div></div>`
        : `<span class="lmn-rd"></span>${radio}<span class="lmn-bi"><b>${display}</b>${each}</span><span class="lmn-bp"><b>${price}</b>${compare}</span>`}
    </label>`
  }).reverse().join("")
  hero = slot(hero, /id="lmn-qty" value="\d"/, `id="lmn-qty" value="${featured}"`)
  const offerTitle = featured === 1 ? "Tu pedido" : "Elige tu pack"
  if (complete) {
    hero = slot(hero, /<div class="lmn-bundle-section">[\s\S]*?(?=<div class="realeasit-btn-wrapper" id="lmnCheckoutFormTarget">)/,
      `<div class="lmn-bundle-section">${offerCards}</div>`)
    hero = slot(hero, /<span>ELIGE TU PACK · PAGAS AL RECIBIR<\/span>/, `<span>${offerTitle}</span>`)
    hero = slot(hero, /<span><b>\{\{ M\[0\] \}\}<\/b> · Envío gratis · Pagas al recibir<\/span>/,
      `<span><b id="lmnStickyPrice">{{ M[${priceSlots[featured - 1]}] }}</b> · Pagas al recibir</span>`)
    hero = slot(hero, /    \/\/ 2\. FECHAS DINÁMICAS[\s\S]*?(?=    \/\/ 3\.)/, "")
    hero = slot(hero, /^( +)selectedIndex = option\.getAttribute[^\n]+/m, `        selectedIndex = option.getAttribute('data-bundle-index') || '0';
        var sticky = document.getElementById('lmnStickyPrice'), amount = option.querySelector('.lmn-bp b');
        if (sticky && amount) sticky.textContent = amount.textContent;`)
    if (brief.delivery) hero = slot(hero, /(<\/form>\s*<\/div>)/, `</form><p>${escape(brief.delivery)}</p></div>`)
    if (brief.sizeGuide) hero = slot(hero, /<div class="lmn-offer-divider">/, `<details class="lmn-size"><summary>Guía de tallas</summary><div class="lmn-size-body"><img src="${escape(brief.sizeGuide)}" alt="Guía de tallas del proveedor" loading="lazy"></div></details><div class="lmn-offer-divider">`)
  } else {
    hero = slot(hero, /<div class="lmn-(?:offer-banner|bundles)">[\s\S]*?(?=<div id="lmnCheckoutFormTarget">)/,
      `<div class="lmn-offer-banner"><b>${offerTitle}</b></div><div class="lmn-bundles">${offerCards}</div>`)
    hero = slot(hero, /(<span class="lmn-cta-s">)[^<]+/, '<span class="lmn-cta-s">Pago contra entrega')
    hero = slot(hero, /<p class="lmn-llega"[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n<\/div>/,
      `${brief.delivery ? `<p class="lmn-llega">${escape(brief.delivery)}</p>` : ""}${brief.warranty ? '<p class="lmn-llega">Cambios en 30 días.</p>' : ""}</div></div>`)
    hero = slot(hero, /id="lmnStickyPrice">\{\{ M\[4\] \}\}/, `id="lmnStickyPrice">{{ M[${priceSlots[featured - 1]}] }}`)
    hero = slot(hero, /id="lmnStickyPack">[^<]+/, `id="lmnStickyPack">${units(featured)}`)
    hero = hero.replace(/<s id="lmnStickyOld">[^<]+<\/s>/, "")
    hero = slot(hero, /    \/\/ 2\. FECHA DE ENTREGA[\s\S]*?(?=    \/\/ 2B\.)/, "")
    hero = slot(hero, /if \(stickyPack\) \{ var q = option.getAttribute\('data-qty'\); stickyPack.textContent = [^\n]+/,
      "if (stickyPack) { var q = option.getAttribute('data-qty'); stickyPack.textContent = '· ' + q + (q === '1' ? ' unidad' : ' unidades'); }")
  }
  hero = slot(hero, /<p class="lmn-aviso"[^\n]+<\/p>/, '<p class="lmn-aviso" id="lmnAviso">Esta variante no está disponible. Elige otra antes de continuar.</p>')
  hero = slot(hero, /var selectedIndex = '\d'/, `var selectedIndex = '${featured - 1}'`)
  hero = hero.replaceAll(/^\s*\/\/.*(?:camisilla|chaleco|vestidos?).*$/gim, "")
  if (brief.illustrative) {
    hero = hero.replace(/(<div class="lmn-(?:gal|gallery-col)">)/, '$1<p style="margin:0;padding:6px 12px;font:600 12px system-ui;color:#413229">Imagen ilustrativa</p>')
  }
  if (short) hero = hero.replace("</style>", `
    .lmn-ann-track{animation:none;width:100%;justify-content:center}
    .lmn-ann-g[aria-hidden]{display:none}.lmn-ann-g{gap:6px 14px;justify-content:center;flex-wrap:wrap;padding-inline:10px}
    .lmn-ann-g span{padding:0}.lmn-ann b{color:#fff}
    .lmn-offer-banner{background:none;padding:0;text-align:left;margin:12px 0 6px}.lmn-offer-banner b{color:var(--lmn-ac)}
    .lmn-cta{animation:none;background:var(--lmn-ac);box-shadow:0 8px 22px #21191528}
    .lmn-cta:focus-visible{outline:2px solid var(--lmn-hi);outline-offset:3px}
    .lmn-cta::after{content:none}.lmn-sub{margin-bottom:12px}
    .lmn-bundles .lmn-bundle-option{order:initial}.lmn-bundles .lmn-star{order:-1}
    .lmn-h1{font-family:Georgia,serif;font-weight:600;letter-spacing:-.04em}
    .lmn-h1 em{color:var(--lmn-ac)}
    .lmn-slide img{object-fit:contain;background:#f3eee7}
    @media(max-width:720px){.lmn-main{aspect-ratio:auto;height:min(69vw,320px)}.lmn-main .lmn-view{height:100%}.lmn-main .lmn-slide img{height:100%;width:100%;aspect-ratio:auto}.lmn-thumbs{display:none}.lmn-copy{padding-top:4px}}
    @media(prefers-reduced-motion:reduce){.lmn-cta{animation:none}}
    </style>`)
  return palette(hero, brief)

}

function makeBody(template: string, brief: Brief) {
  const style = template.match(/<style>[\s\S]*?<\/style>/)?.[0]
  const script = template.match(/<script>[\s\S]*?<\/script>/)?.[0]?.replaceAll(/^\s*\/\/.*(?:camisilla|chaleco|vestidos?).*$/gim, "")
  if (!style || !script) throw new Error("Falta la estructura del cuerpo validado.")
  const short = brief.template === "corta"
  const complete = brief.template === "completa"
  const button = '<button type="button" class="lm-cta" data-q="sel"><span>Pedir y pagar al recibir</span></button>'
  const media = (index: number, cls = "lm-img") =>
    `{%- if product.media[${index}] -%}<img class="${cls}" src="{{ product.media[${index}] | image_url: width: 1000 }}" alt="${escape(brief.product)}" loading="lazy" width="1000" height="1000">{%- endif -%}`
  const section = (theme: string, html: string, id = "") =>
    `<section class="lm-sec ${theme}"${id ? ` id="${id}"` : ""}><div class="lm-w">${html}</div></section>`
  const heading = (html: string) => `<h2 class="lm-h lm-h2">${html}</h2>`
  const values: Record<string, string | undefined> = {
    img_info: brief.media?.info, img_detalle: brief.media?.detail, img_cierre: brief.media?.close,
    img_antes: brief.media?.before, img_despues: brief.media?.after, img_tallas: brief.sizeGuide,
    img_regalo: brief.gift ? brief.media?.gift : "",
  }
  for (let i = 1; i <= 4; i++) values[`vid_${i}`] = brief.media?.videos[i - 1]
  for (let i = 1; i <= 3; i++) values[`img_paso${i}`] = brief.media?.steps[i - 1]
  const assignments = Object.entries(values).map(([variable, value]) => `{%- assign ${variable} = '${value ?? ""}' -%}`).join("\n")
  const lifestyleLabels = ["Ocasión especial", "Plan de día", "Cena", "Salida con amigas", "Fin de semana", "Evento"]
  const lifestyle = (brief.media?.lifestyle ?? []).map((url, i) => `${url}|${lifestyleLabels[i]}`).join("\n")
  const image = (name: string, alt: string, fallback = "", cls = "lm-img") =>
    `{%- if ${name} != '' -%}<img class="${cls}" src="{{ ${name} | escape }}" alt="${escape(alt)}" loading="lazy" width="1000" height="1000">{%- else -%}${fallback}{%- endif -%}`
  const trust = `<div class="lm-sellos"><span>Pagas al recibir</span>${brief.freeShipping ? "<span>Envío gratis</span>" : ""}${brief.warranty ? "<span>Cambios en 30 días</span>" : ""}</div>`
  const packs = brief.prices.map((amount, index) => {
    const qty = index + 1
    const selected = qty === brief.prices.length
    const free = qty === 3 && amount < 3 * brief.prices[0] && amount === brief.prices[1]
    return `<div class="lm-of${selected ? " star on" : ""}" data-plan="${qty}" role="button" tabindex="0" aria-pressed="${selected}">
      <span class="rd"></span><span class="qn"><b>${free ? "2 + 1 gratis" : units(qty)}</b>${qty > 1 ? `<small>${money(Math.floor(amount / qty))} c/u</small>` : ""}</span>
      <span class="cu"><b>${money(amount)}</b>${qty > 1 && amount < brief.prices[0] * qty ? `<s>${money(brief.prices[0] * qty)}</s>` : ""}</span></div>`
  }).reverse().join("")
  const faqItems = [
    ["¿Qué incluye mi pedido?", `Incluye ${escape(brief.product)} en la cantidad que selecciones.`],
    ["¿Cómo elijo la talla?", brief.oneSize ? "Es talla única." : brief.sizeGuide ? "Consulta la guía del proveedor junto a la oferta." : "Consulta las opciones disponibles antes de confirmar."],
    ["¿Cómo pago y cuándo llega?", brief.delivery ? `Pagas al recibir. ${escape(brief.delivery)}` : "Pagas al recibir. Confirma el plazo para tu ciudad antes de pedir."],
    ["¿Puedo pedir más de una unidad?", brief.prices.length === 1 ? "Esta oferta es por una unidad." : "Puedes elegir una de las cantidades de la oferta y revisar la disponibilidad en el formulario."],
    ...short ? [] : [["¿Dónde consulto los cambios?", '<a href="/policies/refund-policy">Consulta nuestra política de cambios.</a>'],
      ["¿Dónde reviso las condiciones de envío?", '<a href="/policies/shipping-policy">Consulta nuestra política de envíos.</a>']],
  ]
  const videos = Array.from({ length: short ? 1 : complete ? 4 : 2 }, (_, i) =>
    `{%- if vid_${i + 1} != '' -%}<figure class="lm-vid"><video data-src="{{ vid_${i + 1} | escape }}" aria-label="Demostración ${i + 1}" muted playsinline loop preload="none" controls></video></figure>{%- endif -%}`).join("")
  const videoCondition = Array.from({ length: short ? 1 : complete ? 4 : 2 }, (_, i) => `vid_${i + 1} != ''`).join(" or ")
  const videoSection = `{%- if ${videoCondition} -%}${section("o oscuro", heading("Míralo en acción") + `<div class="lm-vids">${videos}</div>` + button)}{%- endif -%}`
  const galleryLabel = brief.illustrative ? '<p class="lm-nota">Imagen ilustrativa</p>' : ""
  const photoStrip = `{%- if casa_fotos != blank -%}<div class="lm-tira"><div class="lm-pista">
    {%- assign fotos = casa_fotos | strip | newline_to_br | split: '<br />' -%}
    {%- for item in fotos -%}{%- assign foto = item | strip | split: '|' -%}<figure class="lm-foto"><img src="{{ foto[0] | escape }}" alt="{{ foto[1] | escape }}" loading="lazy" width="480" height="600"><figcaption>{{ foto[1] | escape }}</figcaption></figure>{%- endfor -%}</div></div>${galleryLabel}
    {%- endif -%}`
  const rating = `{%- if product.metafields.reviews.rating_count.value > 0 and product.metafields.reviews.rating.value.rating > 0 -%}
  <p class="lm-p" id="lmResenas">{{ product.metafields.reviews.rating.value.rating | escape }} de 5 · {{ product.metafields.reviews.rating_count.value | escape }} opiniones</p>{%- endif -%}`
  const detail = section("o oscuro", heading(short ? "Diseño y acabados" : "Lo que distingue a " + escape(brief.product)) +
    image(short ? "img_detalle" : "img_info", brief.product, media(1)) + galleryLabel +
    `<ul class="lm-lin lm-facts">${brief.facts.map((fact) => `<li>${escape(fact)}</li>`).join("")}</ul>${button}`)
  const offer = section("t tinte", heading(brief.prices.length === 1 ? "Tu pedido" : "Elige tu pack") +
    image("img_tallas", "Guía de tallas del proveedor") + `<div class="lm-planes">${packs}</div>${button}${trust}`, "lmPacks")
  const faq = section("", heading("Preguntas frecuentes") + `<div class="lm-faq">${faqItems.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join("")}</div>`)
  const closing = section("o oscuro", image("img_cierre", brief.product, media(short ? 2 : 3, "lm-cierre-img"), "lm-cierre-img") +
    galleryLabel + heading(escape(brief.benefit)) + button)
  const steps = brief.steps ? section("", heading("Así de fácil") + `<div class="lm-pasos">${brief.steps.map((step, i) =>
    `<figure class="lm-paso">${image(`img_paso${i + 1}`, step, media(i + 1))}<b>${i + 1}</b><figcaption>${escape(step)}</figcaption></figure>`).join("")}</div>`) : ""
  const comparison = `{%- if img_antes != '' and img_despues != '' -%}${section("", heading("Compara el resultado") +
    '<div id="lmBA" class="lm-ba"><img src="{{ img_antes | escape }}" alt="Antes" loading="lazy"><img class="dp" src="{{ img_despues | escape }}" alt="Después" loading="lazy"><span class="bar"></span><span class="knob">↔</span><input type="range" min="0" max="100" value="50" aria-label="Comparar antes y después"></div><p class="lm-nota">Imagen ilustrativa</p>')}{%- endif -%}`
  const gift = brief.gift ? section("t tinte", heading(escape(brief.gift)) + image("img_regalo", brief.gift)) : ""
  const layout = short
    ? section("", rating + photoStrip + trust) + videoSection + detail
    : videoSection + comparison + section("t tinte", heading(escape(brief.problem)) + button) +
      `{%- if casa_fotos != blank -%}${section("", photoStrip)}{%- endif -%}` + detail + steps + gift
  const extraStyle = `<style>
.lm-facts{list-style:none;padding:0;display:grid;gap:8px;margin:20px 0}.lm-facts li{border:1px solid #ffffff32;border-radius:10px;padding:10px 14px}
.lm-cierre-img{margin:0 auto 20px;max-height:560px;width:auto;object-fit:contain}
.lm .lm-nota{color:inherit}
.lm .lm-h{margin-bottom:14px}
.lm-pista{animation:none;max-width:100%;overflow:auto;width:100%}
</style>`
  const sync = brief.prices.length > 1 ? `<script>
    (function(){
      var input = document.getElementById('lmn-qty');
      if (!input) return;
      input.addEventListener('change', function(){
        var qty = Number(input.value);
        if (!Number.isInteger(qty) || qty < 1 || qty > 3) return;
        var body = document.querySelector('#lmPacks [data-plan="' + qty + '"]');
        var hero = document.querySelector('#product-form-lmn [data-qty="' + qty + '"]');
        if (body && !body.classList.contains('on')) body.click();
        if (hero && !hero.classList.contains('is-selected')) hero.click();
      });
    })();
  </script>` : ""
  return `{%- comment -%} LUMENS · Medios autorizados. Variables vacías ocultan sus secciones. {%- endcomment -%}
${assignments}
{%- capture casa_fotos -%}${lifestyle}{%- endcapture -%}
${palette(style, brief)}${extraStyle}
<div class="lm" id="lmLanding">
${layout}${offer}${faq}${closing}
<footer class="lm-pie"><div class="lm-w"><nav><a href="/policies/refund-policy">Cambios y devoluciones</a><a href="/policies/shipping-policy">Envíos</a><a href="/policies/privacy-policy">Privacidad</a></nav><strong>LUMENS</strong></div></footer>
</div>
${slot(script, /var selectedQty = '\d'/, `var selectedQty = '${brief.prices.length}'`)}${sync}`
}

function makePrompts(brief: Brief) {
  const preciseProduct = brief.garment ?? brief.facts.join(". ")
  const fixed = `Use the exact same product as in the attached authorized product reference. ${preciseProduct || "Preserve the reference product exactly."} Keep the color, shape, construction, texture and proportions identical. No text, watermarks, brand names or claims.`
  const direction = `Use a consistent editorial environment and lighting across the set. If people appear, depict natural Colombian adults in everyday settings. ${brief.audience ? `Audience context: ${brief.audience}. ` : ""}Do not add an unconfirmed color, size or feature.`
  const entries = [
    ["G1", "product.media[0]", "1:1", "Front-facing cover image of the product clearly in use with a clean background."],
    ["G2", "product.media[1]", "1:1", "Photograph only verified variants together. If just one is confirmed, show its defining detail."],
    ["G3", "product.media[2]", "1:1", "Show a three-quarter angle. Use a back view only if it is present in an approved reference."],
    ["G4", "product.media[3]", "1:1", "Macro detail study, with three close-ups of confirmed visible features."],
    ["G5", "product.media[4]", "1:1", "Show the product in a believable daytime setting."],
    ["G6", "product.media[5]", "1:1", "Show the same product in an evening or alternate context."],
    ["G7", "img_tallas", "1:1", "Use the verified supplier chart as-is. Never infer measurements. Omit if unavailable."],
    ["C1", "img_info", "1:1", "Center the exact product, leaving space for approved benefit labels."],
    ["C2", "img_detalle", "1:1", "A close-up of material and three visible design details."],
    ...[["C3","ready for use"],["C4","being set up or put on"],["C5","ready to go"]].map(([code, action], i) => [code, `img_paso${i + 1}`, "3:4", `Show the product ${action}.`]),
    ["C6", "img_cierre", "4:5", "Editorial closing photo in a believable context with clearly visible product."],
    ["C9", "img_antes", "2:3", "Show the ordinary context with honest framing, only if comparison applies. Keep light and camera fixed."],
    ["C10", "img_despues", "2:3", "Using C9 as a reference, show the product in the same framing. No altered body or fabricated result."],
    ...Array.from({length: 6}, (_, i) => [`T${i + 1}`, `casa_fotos[${i}]`, "4:5", `An illustrative lifestyle scene: ${["a daytime plan", "meeting friends", "a dinner", "a weekend outing", "a special occasion", "a casual activity"][i]}. Do not imply it is a customer testimonial.`]),
    ...["A walking or use demonstration.", "Show the product being put on or set up in one take.", "Show a slow turn, using only verified angles.", "Close-up of the product texture and one confirmed detail."].map((action, i) => [`V${i + 1}`, `vid_${i + 1}`, "9:16 · 5–8 s · sin audio", action]),
  ]
  if (brief.gift) entries.push(["C8", "img_regalo", "1:1", "Photograph only the confirmed gift as supplied."])
  return `Producto: ${brief.product}\nAdjunta la foto autorizada en cada prompt y también G1 aprobada desde la segunda imagen. Compara el resultado con la referencia y rotula «Imagen ilustrativa» donde corresponda.\n\n` +
    entries.map(([code, name, format, scene]) => `[${code}] · ${name} · ${format}\n${fixed} ${direction} ${scene}`).join("\n\n")
}

export async function runProduction(input: unknown, photos: Photo[], demo = false) {
  const parsed = productionBrief.safeParse(input)
  if (!parsed.success) throw new ProductionBlocked(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · "))
  const data = parsed.data
  const brief: Brief = {
    ...data,
    problem: data.problem ?? "Encuentra lo que necesitas en un solo lugar",
    benefit: data.benefit ?? "Una elección fácil para tu día",
    template: data.template ?? (data.steps ? data.prices[0] > 179900 ? "completa" : "simple" : "corta"),
  }
  if (brief.category !== "general") throw new ProductionBlocked("2C · Se requiere revisión humana de INVIMA antes de generar Liquid para esta categoría.")
  if (!brief.hasImageRights) throw new ProductionBlocked("2C · Confirma que tienes autorización para usar las imágenes.")
  if ([brief.product, brief.problem, brief.benefit, ...brief.facts, ...(brief.steps ?? []), brief.gift ?? "", brief.delivery ?? ""].some((value) => unsafeCopy.test(value))) {
    throw new ProductionBlocked("2C · El brief contiene promesas, urgencia o prueba social que requieren revisión.")
  }
  const packs = brief.prices.map((price, index) => ({
    units: index + 1, price, contribution: brief.unitCost !== undefined && brief.fulfillment !== undefined
      ? price - brief.unitCost * (index + 1) - brief.fulfillment : null,
  }))
  if (packs.some(({ contribution }) => contribution !== null && contribution <= 0)) throw new ProductionBlocked("2B · Al menos un pack queda sin contribución antes de pauta.")
  if (brief.prices.some((price, i) => i > 0 && (price < brief.prices[i - 1] || i === 1 && price === brief.prices[i - 1]))) throw new ProductionBlocked("3A · El precio de dos unidades debe superar el unitario y el tercer pack no debe costar menos que el segundo.")
  if (photos.length < 1 || photos.length > 7 || photos.reduce((sum, photo) => sum + photo.data.length, 0) > 3_500_000) {
    throw new ProductionBlocked("4B · Adjunta entre 1 y 7 fotos que sumen menos de 3,5 MB.")
  }
  const gallery = photos.map(({ data }, index) => ({ name: photoName(data, index), data }))
  const [heroTemplate, bodyTemplate] = await Promise.all([
    readFile(join(templateRoot, `${brief.template}-1-hero.liquid`), "utf8"),
    readFile(join(templateRoot, `${brief.template}-2-cuerpo.liquid`), "utf8"),
  ])
  const hero = makeHero(heroTemplate, brief)
  const body = makeBody(bodyTemplate, brief)
  const blockSizes = [Buffer.byteLength(hero), Buffer.byteLength(body)]
  if (blockSizes.some((size) => size >= 50_000)) throw new ProductionBlocked("5B · Un bloque supera el límite de Shopify.")
  if (/3ra gratis|lleva 3, paga 2|1\/0671\/0598\/0521|camisilla de compresión para hombre|aplana abdomen y pecho|black november/i.test(hero + body)) throw new ProductionBlocked("5B · Quedó texto del producto de la plantilla; revisa la adaptación.")

  const engine = new Liquid({ strictFilters: true, cache: false })
  engine.registerFilter("image_url", (media?: { src?: string }) => media?.src ?? "")
  engine.registerFilter("placeholder_svg_tag", () => "")
  engine.registerFilter("json", (value: unknown) => JSON.stringify(value))
  const context = { product: {
    title: brief.product, price: brief.prices[0] * 100, compare_at_price: 0, has_only_default_variant: true,
    selected_or_first_available_variant: { id: 1 }, media: gallery.map(({ name }) => ({ src: name, alt: brief.product })),
  } }
  const preview = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(brief.product)} · Vista previa</title><body style="margin:0"><p style="margin:0;padding:10px;font:600 13px system-ui;background:#f3e4cb;color:#33231a">
Vista previa · checkout desactivado${demo ? " · producto e imágenes de demostración" : brief.illustrative ? " · imágenes ilustrativas" : ""}</p>${
    (await engine.parseAndRender(hero, context)).replace('action="/cart/add"', 'action="#lmnCheckoutFormTarget"')
  }${await engine.parseAndRender(body, context)}</body></html>`
  if (!preview.includes("imagenes/G1.") || !preview.includes("lmnCheckoutFormTarget")) throw new ProductionBlocked("5B · La galería o el ancla de compra no se renderizaron.")

  const missing = [
    ["problema", !data.problem], ["ángulo", !data.benefit], ["datos del producto", !brief.facts.length],
    ["fuente verificable", !brief.sources.length], ["costos completos", packs[0].contribution === null],
    ["tabla de tallas", !brief.sizeGuide && !brief.oneSize], ["plazo", !brief.delivery],
    ["video", !brief.media?.videos.length], ["fotos aprobadas para publicar", brief.illustrative],
  ].filter(([, pending]) => pending).map(([label]) => label)
  const hasLocalEvidence = brief.sources.some((source) => source.market === "CO")
  const stages = [
    { code: "0", status: "borrador", detail: "Expediente y entrega preparados para revisión humana." },
    { code: "1A", status: "borrador", detail: `${brief.sources.length} fuentes aportadas. Sin consulta externa automática.` },
    { code: "1B", status: hasLocalEvidence ? "borrador" : "pendiente", detail: hasLocalEvidence ? "Fuentes de Colombia registradas." : "Falta evidencia colombiana." },
    { code: "1C", status: "pendiente", detail: "Requiere histórico para afirmar una tendencia." },
    { code: "2A", status: "pendiente", detail: "Revisar fuentes e hipótesis de demanda con el dueño." },
    { code: "2B", status: packs[0].contribution === null ? "pendiente" : "borrador", detail: packs[0].contribution === null ? "Faltan costos para calcular contribución." : "Contribución calculada. Verificar stock y proveedor." },
    { code: "2C", status: "borrador", detail: "Filtro inicial de promesas y derechos declarado. Revisión humana pendiente." },
    { code: "3A", status: "borrador", detail: `${packs.length} opciones de precio ingresadas.` },
    { code: "3B", status: "completado", detail: `Liquid, CSS y vista previa generados con la plantilla ${templateLabels[brief.template]}.` },
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
  const prompt = makePrompts(brief)
  const checklist = `# Entrega LUMENS · ${brief.product}

${brief.audience ? `Público: ${brief.audience}\n` : ""}Plantilla: ${templateLabels[brief.template]}.
${brief.reference ? `Referencia: ${brief.reference}\n` : ""}${demo ? "Producto ficticio e imágenes de demostración.\n" : ""}
${packs.map(({ units: quantity, price, contribution }) => `- ${units(quantity)}: ${money(price)} COP.${contribution === null ? "" : ` Contribución estimada antes de pauta: ${money(contribution)} COP.`}`).join("\n")}

- Abre vista-previa.html desde la carpeta extraída.
- En un tema Horizon duplicado, oculta «Información del producto» y pega 1-producto.txt (${blockSizes[0]} bytes) y 2-landing.txt (${blockSizes[1]} bytes) en dos bloques de Liquid personalizado.
- ${brief.illustrative ? "La galería de prueba es ilustrativa. Contrasta las imágenes con la prenda y reemplázalas por fotos aprobadas antes de usar el tema en una tienda." : "Sube imagenes/ a la galería en el orden entregado y etiqueta cada foto con su color."}
- Confirma disponibilidad de tallas y variantes. Asigna una foto a cada variante de color en Shopify y sube los demás medios a Contenido → Archivos.
- En Shopify confirma ${money(brief.prices[0])} para la unidad. En Releasit configura las cantidades ${packs.map((pack) => pack.units).join(" → ")} con los mismos totales y deja el envío prioritario sin marcar.
- En el celular, cambia cantidad y variante, abre Releasit y valida el total. Verifica que la barra fija aparezca después de pasar el botón principal.

## Lo que falta confirmar
${missing.length ? missing.map((label) => `- ${label}`).join("\n") : "- Revisar las fuentes y los datos antes de publicar."}
`
  const files = {
    "1-producto.txt": strToU8(hero), "2-landing.txt": strToU8(body),
    "vista-previa.html": strToU8(preview), "LEEME.md": strToU8(checklist),
    "prompts.txt": strToU8(prompt),
    "borrador-campana.md": strToU8(`# Borrador · ${brief.product}\n\nÁngulo: ${brief.problem} → ${brief.benefit}\n\nCTA: Elige tu pack y paga al recibir.\n`),
    "informe.json": strToU8(JSON.stringify({ demo, template: brief.template, blockSizes, packs, illustrative: brief.illustrative, missing, sources: brief.sources, reference: brief.reference, stages }, null, 2)),
    ...Object.fromEntries(gallery.map(({name,data}) => [name,data])),
  }
  return { zip: zipSync(files, { level: 5 }), packs, stages, blockSizes }
}
