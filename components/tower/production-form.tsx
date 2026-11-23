"use client"

import { useState, type FormEvent } from "react"
import { Download, FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TowerField, towerInput } from "@/components/tower/field"

const splitLines = (value: FormDataEntryValue | null) => String(value ?? "").split("\n").map((line) => line.trim()).filter(Boolean)
const number = (value: FormDataEntryValue | null) => value === null || value === "" ? undefined : Number(value)

export function ProductionForm() {
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)

  async function produce(data: FormData, filename = "LUMENS-Produccion.zip") {
    setPending(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/tower/production", { method: "POST", body: data })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message ?? "No se pudo generar el paquete.")
      }
      const link = document.createElement("a")
      const url = URL.createObjectURL(await response.blob())
      link.href = url
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setFeedback({ text: "Paquete listo. Extrae el ZIP y abre vista-previa.html.", ok: true })
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "No se pudo generar el paquete.", ok: false })
    } finally { setPending(false) }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const payload = new FormData()
    for (const photo of fields.getAll("photos")) payload.append("photos", photo)
    if (fields.get("p3") && !fields.get("p2")) {
      setFeedback({ text: "Indica el precio de dos unidades antes de agregar el de tres.", ok: false })
      return
    }
    payload.set("brief", JSON.stringify({
      product: fields.get("product"), problem: fields.get("problem") || undefined, benefit: fields.get("benefit") || undefined,
      audience: fields.get("audience") || undefined,
      garment: fields.get("garment") || undefined, gift: fields.get("gift") || undefined,
      facts: splitLines(fields.get("facts")), steps: fields.get("steps") ? splitLines(fields.get("steps")) : undefined,
      category: fields.get("category"), template: fields.get("template") || undefined,
      sizeGuide: fields.get("sizeGuide") || undefined, oneSize: fields.has("oneSize"),
      media: {
        videos: splitLines(fields.get("videos")), lifestyle: splitLines(fields.get("lifestyle")),
        detail: fields.get("detail") || undefined, close: fields.get("close") || undefined,
        info: fields.get("info") || undefined, steps: splitLines(fields.get("stepPhotos")),
        before: fields.get("before") || undefined, after: fields.get("after") || undefined,
        gift: fields.get("giftPhoto") || undefined,
      },
      sources: fields.get("source") ? [{ url: fields.get("source"), market: fields.get("market"), observation: fields.get("observation") }] : undefined,
      prices: [number(fields.get("p1")), number(fields.get("p2")), number(fields.get("p3"))].filter((value) => value !== undefined),
      unitCost: number(fields.get("unitCost")), fulfillment: number(fields.get("fulfillment")),
      accent: fields.get("accent"), highlight: fields.get("highlight"),
      delivery: fields.get("delivery") || undefined, freeShipping: fields.has("freeShipping"), warranty: fields.has("warranty"),
      hasImageRights: fields.has("hasImageRights"), illustrative: fields.has("illustrative"),
    }))
    void produce(payload)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Button type="button" variant="outline" disabled={pending} onClick={() => {
          const data = new FormData()
          data.set("demo", "1")
          void produce(data)
        }}><FlaskConical className="mr-2 h-4 w-4" aria-hidden="true" /> Probar con producto de ejemplo</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => {
          const data = new FormData()
          data.set("sample", "milan")
          void produce(data, "LUMENS-Enterizo-Milan.zip")
        }}><Download className="mr-2 h-4 w-4" aria-hidden="true" /> Probar Enterizo Milán</Button>
        <span className="text-xs text-muted-foreground">Enterizo Milán · 1 unidad por $149.900 COP · galería ilustrativa</span>
      </div>
      {feedback && <p role={feedback.ok ? "status" : "alert"} className="rounded-xl border bg-card p-3 text-sm">{feedback.text}</p>}
      <form id="brief-landing" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6" onSubmit={submit}>
        <TowerField label="Plantilla">
          <select className={towerInput} name="template">
            <option value="">Automática</option>
            <option value="corta">Simple corta · Moda, hogar o accesorios</option>
            <option value="simple">Simple explicativa · Ionfit</option>
            <option value="completa">Completa · Producto técnico</option>
          </select>
        </TowerField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TowerField label="Producto"><input className={towerInput} name="product" required maxLength={80} /></TowerField>
          <TowerField label="Beneficio principal comprobable"><input className={towerInput} name="benefit" maxLength={80} /></TowerField>
        </div>
        <TowerField label="Para quién"><input className={towerInput} name="audience" maxLength={220} /></TowerField>
        <TowerField label="Descripción visual para los prompts"><input className={towerInput} name="garment" maxLength={220} /></TowerField>
        <TowerField label="Problema del comprador"><textarea className={towerInput} name="problem" maxLength={220} rows={2} /></TowerField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TowerField label="Hasta 5 hechos del producto, uno por línea"><textarea className={towerInput} name="facts" rows={4} /></TowerField>
          <TowerField label="3 pasos de uso, uno por línea"><textarea className={towerInput} name="steps" rows={4} /></TowerField>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
          <TowerField label="Fuente HTTPS"><input className={towerInput} name="source" type="url" /></TowerField>
          <TowerField label="País"><input className={towerInput} name="market" defaultValue="CO" pattern="[A-Z]{2}" required /></TowerField>
        </div>
        <TowerField label="Qué demuestra esa fuente"><input className={towerInput} name="observation" maxLength={220} /></TowerField>
        <TowerField label="Categoría"><select className={towerInput} name="category">
          <option value="general">General</option><option value="uso_en_piel">Uso en piel</option>
          <option value="cosmetico">Cosmético</option><option value="ingerible">Ingerible</option>
        </select></TowerField>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["p1", "Precio 1 unidad"], ["p2", "Precio 2 unidades"], ["p3", "Precio 3 unidades (opcional)"], ["unitCost", "Costo unitario"], ["fulfillment", "Costo logístico por pedido"]] as const).map(([name, label]) =>
            <TowerField key={name} label={label + " · COP"}><input className={towerInput} name={name} type="number" min={name === "fulfillment" ? 0 : 1} max={100000000} required={name === "p1"} /></TowerField>
          )}
          <TowerField label="Plazo confirmado (opcional)"><input className={towerInput} name="delivery" maxLength={220} /></TowerField>
        </div>
        <details className="space-y-3 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">Tallas, medios y colores</summary>
          <div className="grid gap-3 sm:grid-cols-2">
            <TowerField label="Guía de tallas del proveedor (URL de Shopify)"><input className={towerInput} type="url" name="sizeGuide" /></TowerField>
            <TowerField label="Detalle (URL de Shopify)"><input className={towerInput} type="url" name="detail" /></TowerField>
            <TowerField label="Foto de cierre (URL de Shopify)"><input className={towerInput} type="url" name="close" /></TowerField>
            <TowerField label="Videos (URL de Shopify, uno por línea)"><textarea className={towerInput} name="videos" rows={2} /></TowerField>
            <TowerField label="Infografía (URL de Shopify)"><input className={towerInput} type="url" name="info" /></TowerField>
            <TowerField label="Fotos de pasos (URL de Shopify, una por línea)"><textarea className={towerInput} name="stepPhotos" rows={2} /></TowerField>
            <TowerField label="Antes (URL de Shopify)"><input className={towerInput} type="url" name="before" /></TowerField>
            <TowerField label="Después (URL de Shopify)"><input className={towerInput} type="url" name="after" /></TowerField>
            <TowerField label="Regalo confirmado"><input className={towerInput} name="gift" maxLength={220} /></TowerField>
            <TowerField label="Foto del regalo (URL de Shopify)"><input className={towerInput} type="url" name="giftPhoto" /></TowerField>
            <TowerField label="Fotos en uso (URL de Shopify, una por línea)"><textarea className={towerInput} name="lifestyle" rows={2} /></TowerField>
            <div className="flex gap-4">
              <TowerField label="Color oscuro"><input name="accent" type="color" defaultValue="#231b18" /></TowerField>
              <TowerField label="Acento"><input name="highlight" type="color" defaultValue="#8a5635" /></TowerField>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input name="oneSize" type="checkbox" /> Talla única confirmada</label>
        </details>
        <label className="flex items-center gap-2 text-sm"><input name="freeShipping" type="checkbox" /> Envío gratis confirmado</label>
        <label className="flex items-center gap-2 text-sm"><input name="warranty" type="checkbox" /> Cambios en 30 días confirmados</label>
        <label className="flex items-center gap-2 text-sm"><input name="illustrative" type="checkbox" /> Las fotos son ilustrativas</label>
        <TowerField label="Fotos autorizadas · 1 a 7 · Máximo 3,5 MB en total"><input className={towerInput} name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required /></TowerField>
        <label className="flex items-center gap-2 text-sm"><input name="hasImageRights" type="checkbox" required /> Tengo autorización para usar estas fotos</label>
        <Button type="submit" disabled={pending}><Download className="mr-2 h-4 w-4" aria-hidden="true" /> {pending ? "Preparando entrega…" : "Generar paquete"}</Button>
      </form>
    </div>
  )
}
