"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { ImagePlus, Loader2, X, ArrowUp, ArrowDown } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

async function uploadToProducts(file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from("products").upload(path, file)
  if (error) throw new Error(error.message)
  return supabase.storage.from("products").getPublicUrl(path).data.publicUrl
}

/** Subida de la imagen principal del producto (bucket público `products`). */
export function MainImageUpload({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    setBusy(true)
    try {
      onChange(await uploadToProducts(file))
      toast.success("Imagen subida")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error subiendo imagen")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-md border">
          <Image src={value} alt="Imagen principal" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <ImagePlus className="h-5 w-5" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ""
        }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
          {value ? "Cambiar" : "Subir imagen"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Quitar
          </Button>
        )}
      </div>
    </div>
  )
}

/** Galería: subida múltiple + reordenar + eliminar. */
export function GalleryUpload({
  value,
  onChange,
}: {
  value: string[]
  onChange: (urls: string[]) => void
}) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFiles(files: FileList) {
    setBusy(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 8)) {
        urls.push(await uploadToProducts(file))
      }
      onChange([...value, ...urls])
      toast.success(`${urls.length} imagen(es) subida(s)`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error subiendo imágenes")
    } finally {
      setBusy(false)
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border">
            <Image src={url} alt={`Galería ${i + 1}`} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 hidden items-center justify-center gap-0.5 bg-black/50 group-hover:flex">
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Mover antes">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Mover después">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded p-1 text-white hover:bg-white/20" aria-label="Eliminar">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void onFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
        Agregar a galería
      </Button>
    </div>
  )
}
