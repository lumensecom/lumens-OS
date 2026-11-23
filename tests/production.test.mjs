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
      assert.ok(rendered.includes(`<span class="lmn-bp"><b>$${price}</b></span>`), "hero " + price)
      assert.ok(rendered.includes(`<span class="cu"><b>$${price}</b></span>`), "body " + price)
    }
  }],
  ["costo logístico cero documentado", { fulfillment: 0 }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).packs[0].contribution, 37900)],
  ["límite de contribución positiva", { prices:[24001, 36001], fulfillment:12000 }, undefined, (files) => assert.equal(JSON.parse(text(files, "informe.json")).packs[1].contribution, 1)],
  ["COP de cuatro dígitos", { prices: [5999, 8599], unitCost: 1000, fulfillment: 1000 }, undefined, (files) => assert.match(text(files, "vista-previa.html"), /lmn-bp"><b>\$5\.999/)],
  ["COP de siete dígitos", { prices: [1000000, 1999900], unitCost: 100000 }, undefined, (files) => assert.match(text(files, "vista-previa.html"), /lmn-bp"><b>\$1\.999\.900/)],
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
  ["dos hechos", { facts: base.facts.slice(0, 2) }, undefined, /facts/],
  ["dos pasos", { steps: base.steps.slice(0, 2) }, undefined, /steps/],
  ["fuente ausente", { sources: [] }, undefined, /sources/],
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
  ["orden incorrecto", { prices: [70000, 60000] }, undefined, /aumentar/],
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
