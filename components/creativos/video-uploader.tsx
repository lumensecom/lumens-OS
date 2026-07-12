"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Clapperboard, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export type UploadedVideo = {
  videoPath: string
  thumbnailPath: string | null
  durationSeconds: number
}

/** Captura el primer frame del video como thumbnail JPEG. */
function captureThumbnail(
  file: File,
): Promise<{ blob: Blob | null; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const url = URL.createObjectURL(file)
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    video.src = url
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    }
    video.onseeked = () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve({ blob: null, duration: Math.round(video.duration || 0) })
        return
      }
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          resolve({ blob, duration: Math.round(video.duration || 0) })
        },
        "image/jpeg",
        0.8,
      )
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo leer el video"))
    }
  })
}

/** Sube un MP4 al bucket privado `creatives` + thumbnail del primer frame. */
export function VideoUploader({
  onUploaded,
  currentPath,
}: {
  onUploaded: (result: UploadedVideo) => void
  currentPath?: string | null
}) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Máximo 200 MB por video")
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const ext = file.name.split(".").pop() ?? "mp4"
      const videoPath = `${stamp}.${ext}`

      const { error: videoError } = await supabase.storage
        .from("creatives")
        .upload(videoPath, file)
      if (videoError) throw new Error(videoError.message)

      let thumbnailPath: string | null = null
      let duration = 0
      try {
        const { blob, duration: d } = await captureThumbnail(file)
        duration = d
        if (blob) {
          thumbnailPath = `${stamp}-thumb.jpg`
          const { error: thumbError } = await supabase.storage
            .from("creatives")
            .upload(thumbnailPath, blob)
          if (thumbError) thumbnailPath = null
          else setPreview(URL.createObjectURL(blob))
        }
      } catch {
        // El thumbnail es best-effort; el video ya quedó subido.
      }

      setFileName(file.name)
      onUploaded({ videoPath, thumbnailPath, durationSeconds: duration })
      toast.success("Video subido")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error subiendo video")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <div className="relative h-20 w-14 overflow-hidden rounded-md border">
          <Image src={preview} alt="Thumbnail" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-20 w-14 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <Clapperboard className="h-5 w-5" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ""
        }}
      />
      <div className="min-w-0">
        <Button type="button" variant="outline" size="sm" disabled={busy}
          onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Clapperboard className="mr-1 h-4 w-4" />}
          {currentPath || fileName ? "Cambiar video" : "Subir video"}
        </Button>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {fileName || currentPath || "MP4, MOV o WebM · thumbnail automático"}
        </p>
      </div>
    </div>
  )
}
