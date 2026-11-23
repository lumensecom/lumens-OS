import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { strFromU8, unzipSync } from "fflate"
import { ProductionBlocked, runProduction } from "../lib/production/pipeline.ts"
import { productionRoster } from "../lib/production/roster.ts"

const base = JSON.parse(await readFile("lib/production/demo/brief.json", "utf8"))
const gallery = await Promise.all([1, 2, 3, 4].map(async (i) => ({ data: await readFile(`lib/production/demo/G${i}.webp`) })))
const text = (files, key) => strFromU8(files[key])
const locals = ["CO", "PE", "MX"].map((market) => ({ url: `https://example.invalid/${market}`, market, observation: "Señal documentada de ejemplo" }))
const success = [
  ["demo completo", {}, undefined, (files) => assert.match(text(files, "vista-previa.html"), /producto e imágenes de demostración/)],
  ["dos packs", { prices: [49900, 84900] }, undefined, (files) => {
    assert.doesNotMatch(text(files, "1-producto.txt"), /data-qty="3"/)
    assert.match(text(files, "1-producto.txt"), /var selectedIndex = '1'/)
    assert.match(text(files, "2-landing.txt"), /var selectedQty = '2'/)
  }],
  ["tres packs", {}, undefined, (files) => assert.match(text(files, "1-producto.txt"), /data-bundle-index="2" data-qty="3"/)],
  ["una foto", {}, gallery.slice(0, 1), (files) => assert.equal(Object.keys(files).filter((path) => path.startsWith("imagenes/")).length, 1)],
  ["cuatro fotos", {}, undefined, (files) => assert.deepEqual(files["imagenes/G4.webp"], new Uint8Array(gallery[3].data))],
  ["siete fotos", {}, [...gallery, ...gallery.slice(0, 3)], (files) => assert.ok(files["imagenes/G7.webp"])],
  ["plazo informado", { delivery: "De 3 a 5 días hábiles" }, undefined, (files) => assert.match(text(files, "2-landing.txt"), /De 3 a 5 días hábiles/)],
  ["plazo omitido", {}, undefined, (files) => assert.doesNotMatch(text(files, "vista-previa.html"), /te llega entre el|días hábiles/)],
  ["envío gratis autorizado", { freeShipping: true }, undefined, (files) => assert.match(text(files, "2-landing.txt"), /Envío gratis/)],
  ["envío gratis ausente", {}, undefined, (files) => assert.doesNotMatch(text(files, "vista-previa.html"), /envío gratis/i)],
  ["fuentes de varios mercados", { sources: locals }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).sources.length, 3)],
  ["sin fuente colombiana", { sources: locals.slice(1) }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).stages.find(({ code }) => code === "1B").status, "pendiente")],
  ["caracteres especiales", { product: "Organizador A & B" }, undefined, (files) => assert.match(text(files, "vista-previa.html"), /Organizador A &amp; B/)],
  ["colores del producto", { accent: "#81523e" }, undefined, (files) => assert.match(text(files, "1-producto.txt"), /#81523e/)],
  ["cinco hechos", { facts: [...base.facts, "Base alargada", "Bordes redondeados"] }, undefined, (files) => assert.match(text(files, "2-landing.txt"), /Bordes redondeados/)],
  ["precios consistentes en hero y cuerpo", { prices: [58900, 91900, 124900] }, undefined, (files) => {
    assert.match(text(files, "1-producto.txt"), /lmn_p2 = 9190000/)
    for (const price of ["58.900", "91.900", "124.900"]) {
      const rendered = text(files, "vista-previa.html")
      assert.ok(rendered.includes(`<span class="lmn-bp"><b>$${price}</b>`), "hero " + price)
      assert.ok(rendered.includes(`<span class="cu"><b>$${price}</b>`), "body " + price)
    }
  }],
  ["costo logístico cero documentado", { fulfillment: 0 }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).packs[0].contribution, 37900)],
  ["límite de contribución positiva", { prices:[24001, 36001], fulfillment:12000 }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).packs[1].contribution, 1)],
  ["COP de cuatro dígitos", { prices: [5999, 8599], unitCost: 1000, fulfillment: 1000 }, undefined, (files) => assert.match(text(files, "vista-previa.html"), /lmn-bp"><b>\$5\.999/)],
  ["COP de siete dígitos", { template: "simple", prices: [1000000, 1999900], unitCost: 100000 }, undefined, (files) => assert.match(text(files, "vista-previa.html"), /lmn-bp"><b>\$1\.999\.900/)],
  ["costo unitario de otro proveedor", { unitCost: 20000 }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).packs[2].contribution, 42900)],
  ["dos fotos", {}, gallery.slice(0, 2), (files) => assert.ok(files["imagenes/G2.webp"])],
  ["tres fotos", {}, gallery.slice(0, 3), (files) => assert.ok(files["imagenes/G3.webp"])],
  ["cinco fotos", {}, [...gallery, gallery[0]], (files) => assert.ok(files["imagenes/G5.webp"])],
  ["seis fotos", {}, [...gallery, ...gallery.slice(0, 2)], (files) => assert.ok(files["imagenes/G6.webp"])],
  ["color oscuro", { accent: "#26393b" }, undefined, (files) => assert.match(text(files, "2-landing.txt"), /#26393b/)],
  ["cuatro hechos", { facts: [...base.facts, "Textura suave"] }, undefined, (files) => assert.match(text(files, "2-landing.txt"), /Textura suave/)],
  ["hasta ocho fuentes", { sources: Array.from({length:8}, (_, i) => ({ ...locals[i % 3], url: "https://example.invalid/prueba-" + i })) }, undefined,
    (files) => assert.equal(JSON.parse(text(files, "informe.json")).sources.length, 8)],
  ["producto distinto con copy propio", { product: "Organizador plástico", problem: "Tus lápices quedan dispersos", benefit: "Encuentra tus lápices a mano",
    facts: ["Tres divisiones", "Material plástico", "Base rectangular"], steps: ["Ponlo en tu escritorio", "Separa los lápices", "Recoge los útiles"] }, gallery.slice(0, 1),
    (files) => assert.match(text(files, "2-landing.txt"), /Tus lápices quedan dispersos/)],
  ["pasos personalizados", { steps: ["Abre la caja", "Organiza los conectores", "Colócalos cerca"] }, undefined,
    (files) => assert.match(text(files, "2-landing.txt"), /Organiza los conectores/)],
]
for (const [label, overrides, photos, verify] of success) {
  test(`entrega · ${label}`, async () => {
    const result = await runProduction({ ...base, ...overrides }, photos ?? gallery, true)
    const files = unzipSync(result.zip)
    assert.equal(result.stages.length, 18)
    assert.deepEqual(new Set(result.stages.map(({ code }) => code)), new Set(productionRoster.map(([code]) => code)))
    assert.ok(result.blockSizes.every((size) => size < 50_000))
    for (const artifact of ["1-producto.txt", "2-landing.txt", "vista-previa.html", "LEEME.md", "prompts.txt", "informe.json", "borrador-campana.md"]) assert.ok(files[artifact])
    assert.match(text(files, "1-producto.txt"), /function marcarOfertaReleasit\(/)
    assert.match(text(files, "2-landing.txt"), /function clickOferta\(/)
    assert.match(text(files, "vista-previa.html"), /imagenes\/G1\.webp/)
    assert.doesNotMatch(text(files, "vista-previa.html"), /action="\/cart\/add"|IONFIT_avatar/i)
    verify(files)
  })
}

const blocked = [
  ["sin problemática", { problem: "" }, undefined, /problem/],
  ["sin producto", { product: "" }, undefined, /product/],
  ["sin beneficio", { benefit: "" }, undefined, /benefit/],
  ["dos pasos", { steps: base.steps.slice(0, 2) }, undefined, /steps/],
  ["fuente sin HTTPS", { sources: [{ ...locals[0], url: "http://example.invalid" }] }, undefined, /sources/],
  ["credenciales en fuente", { sources: [{ ...locals[0], url: "https://user:pass@example.invalid" }] }, undefined, /credenciales/],
  ["cosmético sin revisión", { category: "cosmetico" }, undefined, /INVIMA/],
  ["ingerible sin revisión", { category: "ingerible" }, undefined, /INVIMA/],
  ["uso en piel sin revisión", { category: "uso_en_piel" }, undefined, /INVIMA/],
  ["promesa de salud", { benefit: "Elimina el dolor" }, undefined, /promesas/],
  ["urgencia inventada", { benefit: "Solo hoy" }, undefined, /urgencia/],
  ["Liquid aportado en el texto", { product: "{{ shop.name }}" }, undefined, /product/],
  ["sin autorización de fotos", { hasImageRights: false }, undefined, /autorización/],
  ["pack sin margen", { prices: [24000, 36000] }, undefined, /contribución/],
  ["orden incorrecto", { prices: [70000, 60000] }, undefined, /superar el unitario/],
  ["sin fotos", {}, [], /Adjunta/],
  ["foto inválida", {}, [{ data: new Uint8Array(50) }], /PNG, JPG y WebP/],
  ["galería demasiado pesada", {}, [{ data: new Uint8Array(3_500_001) }], /3,5 MB/],
]
for (const [label, overrides, photos, reason] of blocked) {
  test(`bloqueo · ${label}`, async () => {
    await assert.rejects(
      runProduction({ ...base, ...overrides }, photos ?? gallery),
      (error) => error instanceof ProductionBlocked && reason.test(error.message),
    )
  })
}

const milan = JSON.parse(await readFile("lib/production/milan/brief.json", "utf8"))

test("3B · Enterizo Milán: oferta unitaria y galería ilustrativa", async () => {
  const photos = await Promise.all([1, 2, 3].map(async (index) => ({ data: await readFile(`lib/production/milan/G${index}.webp`) })))
  const result = await runProduction(milan, photos)
  const files = unzipSync(result.zip)
  const hero = text(files, "1-producto.txt")
  const body = text(files, "2-landing.txt")
  const html = text(files, "vista-previa.html")
  const report = JSON.parse(text(files, "informe.json"))
  assert.equal(report.template, "corta")
  assert.equal(report.illustrative, true)
  assert.deepEqual(report.packs, [{ units: 1, price: 149900, contribution: null }])
  assert.equal((hero.match(/data-bundle-index="\d" data-qty=/g) ?? []).length, 1)
  assert.equal((body.match(/data-plan="\d"/g) ?? []).length, 1)
  assert.match(html, /lmn-bp"><b>\$149\.900/)
  assert.match(html, /class="cu"><b>\$149\.900/)
  assert.match(html, /Imagen ilustrativa/)
  assert.doesNotMatch(html, /144\.900|69\.900|Pádel|LuxVera|Zafiro|Talla única|<video|opiniones|Envío gratis|30 días/i)
  assert.equal(Object.keys(files).filter((name) => name.startsWith("imagenes/")).length, 3)
  assert.ok(result.blockSizes.every((size) => size < 50000))
  assert.match(text(files, "LEEME.md"), /envío prioritario sin marcar/)
  for (const target of ["[G1]", "[G7]", "[C10]", "[T6]", "[V4]"]) {
    assert.ok(text(files, "prompts.txt").includes(target))
  }
})

test("3B · el producto puede arrancar con una foto y un precio", async () => {
  const result = await runProduction({ product: "Accesorio de escritorio", prices: [49000], hasImageRights: true, category: "general" }, gallery.slice(0, 1))
  const report = JSON.parse(text(unzipSync(result.zip), "informe.json"))
  assert.ok(report.missing.includes("costos completos"))
  assert.ok(report.missing.includes("ángulo"))
  assert.equal(report.stages.find(({ code }) => code === "2B").status, "pendiente")
})

test("3B · la estructura completa conserva packs y deja espacios sin medios fuera de la vista", async () => {
  const result = await runProduction({ ...base, template: "completa" }, gallery)
  const files = unzipSync(result.zip)
  const html = text(files, "vista-previa.html")
  assert.match(html, /class="lmn-product-container"/)
  assert.match(html, /lmn-bp"><b class="lmn-price-current">\$114\.900/)
  assert.match(html, /function marcarOfertaReleasit/)
  assert.match(html, /function clickOferta/)
  assert.doesNotMatch(html, /<video|Chaleco Moldeador|30 DÍAS/i)
  assert.ok(result.blockSizes.every((size) => size < 50000))
})

test("3B · en moda, la galería de uso, la guía y el video usan solo medios aportados", async () => {
  const sizeGuide = "https://cdn.shopify.com/s/files/guide.webp"
  const videos = ["https://cdn.shopify.com/videos/c/o/v/verified.mp4"]
  const lifestyle = ["https://cdn.shopify.com/s/files/use.webp"]
  const result = await runProduction({ ...milan, sizeGuide, media: { videos, lifestyle } }, gallery)
  const body = text(unzipSync(result.zip), "vista-previa.html")
  assert.match(body, /guide\.webp/)
  assert.match(body, /verified\.mp4/)
  assert.match(body, /use\.webp/)
  assert.match(body, /Ocasión especial/)
  assert.match(body, /id="lmnGuiaBtn"/)
})

test("3B · sin promesa de 2 + 1 cuando la oferta tiene un precio distinto", async () => {
  const result = await runProduction({ ...milan, prices: [149900, 239840, 314790] }, gallery)
  const preview = text(unzipSync(result.zip), "vista-previa.html")
  assert.doesNotMatch(preview, /2 \+ 1 gratis/i)
  assert.match(preview, /data-bundle-index="2" data-qty="3"[\s\S]*data-bundle-index="1" data-qty="2"/)
  assert.match(preview, /lmn-bp"><b>\$314\.790/)
})

test("3B · admite la oferta 2 + 1 cuando el tercer pack cuesta exactamente lo mismo", async () => {
  const result = await runProduction({ ...milan, prices: [149900, 239840, 239840] }, gallery)
  assert.match(text(unzipSync(result.zip), "vista-previa.html"), /2 \+ 1 gratis/i)
})

test("3B · excluye medios sin procedencia en Shopify y conserva la revisión de derechos", async () => {
  await assert.rejects(runProduction({ ...milan, media: { videos: ["https://example.invalid/video"] } }, gallery), /media/)
  await assert.rejects(runProduction({ ...milan, hasImageRights: false }, gallery), /autorización/)
})
