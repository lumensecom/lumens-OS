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

  async function produce(data: FormData) {
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
      link.download = "LUMENS-Produccion.zip"
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
    payload.set("brief", JSON.stringify({
      product: fields.get("product"), problem: fields.get("problem"), benefit: fields.get("benefit"),
      facts: splitLines(fields.get("facts")), steps: splitLines(fields.get("steps")),
      category: fields.get("category"),
      sources: [{ url: fields.get("source"), market: fields.get("market"), observation: fields.get("observation") }],
      prices: [number(fields.get("p1")), number(fields.get("p2")), number(fields.get("p3"))].filter((value) => value !== undefined),
      unitCost: number(fields.get("unitCost")), fulfillment: number(fields.get("fulfillment")),
      delivery: fields.get("delivery") || undefined, freeShipping: fields.has("freeShipping"),
      hasImageRights: fields.has("hasImageRights"),
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
        <span className="text-xs text-muted-foreground">Incluye cuatro imágenes de demostración.</span>
      </div>
      {feedback && <p role={feedback.ok ? "status" : "alert"} className="rounded-xl border bg-card p-3 text-sm">{feedback.text}</p>}
      <form className="space-y-4 rounded-xl border bg-card p-4 sm:p-6" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TowerField label="Producto"><input className={towerInput} name="product" required maxLength={80} /></TowerField>
          <TowerField label="Beneficio principal comprobable"><input className={towerInput} name="benefit" required maxLength={80} /></TowerField>
        </div>
        <TowerField label="Problema del comprador"><textarea className={towerInput} name="problem" required maxLength={220} rows={2} /></TowerField>
        <div className="grid gap-3 sm:grid-cols-2">
          <TowerField label="3 a 5 hechos del producto, uno por línea"><textarea className={towerInput} name="facts" required rows={4} /></TowerField>
          <TowerField label="3 pasos de uso, uno por línea"><textarea className={towerInput} name="steps" required rows={4} /></TowerField>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
          <TowerField label="Fuente HTTPS"><input className={towerInput} name="source" type="url" required /></TowerField>
          <TowerField label="País"><input className={towerInput} name="market" defaultValue="CO" pattern="[A-Z]{2}" required /></TowerField>
        </div>
        <TowerField label="Qué demuestra esa fuente"><input className={towerInput} name="observation" maxLength={220} required /></TowerField>
        <TowerField label="Categoría"><select className={towerInput} name="category">
          <option value="general">General</option><option value="uso_en_piel">Uso en piel</option>
          <option value="cosmetico">Cosmético</option><option value="ingerible">Ingerible</option>
        </select></TowerField>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["p1", "Precio 1 unidad"], ["p2", "Precio 2 unidades"], ["p3", "Precio 3 unidades (opcional)"], ["unitCost", "Costo unitario"], ["fulfillment", "Costo logístico por pedido"]] as const).map(([name, label]) =>
            <TowerField key={name} label={label + " · COP"}><input className={towerInput} name={name} type="number" min={name === "fulfillment" ? 0 : 1} max={100000000} required={name !== "p3"} /></TowerField>
          )}
          <TowerField label="Plazo confirmado (opcional)"><input className={towerInput} name="delivery" maxLength={220} /></TowerField>
        </div>
        <label className="flex items-center gap-2 text-sm"><input name="freeShipping" type="checkbox" /> Envío gratis confirmado</label>
        <TowerField label="Fotos autorizadas · 1 a 7 · Máximo 3,5 MB en total"><input className={towerInput} name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required /></TowerField>
        <label className="flex items-center gap-2 text-sm"><input name="hasImageRights" type="checkbox" required /> Tengo autorización para usar estas fotos</label>
        <Button type="submit" disabled={pending}><Download className="mr-2 h-4 w-4" aria-hidden="true" /> {pending ? "Preparando entrega…" : "Generar paquete"}</Button>
      </form>
    </div>
  )
}
