"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { toast } from "sonner"
import {
  ArrowUp, Check, Copy, ImagePlus, Loader2, RotateCcw, Sparkles, Square, X,
} from "lucide-react"

import { AI_TASKS, type AiTask } from "@/lib/ai"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/conocimiento/markdown"

type AttachedImage = {
  media_type: "image/jpeg"
  data: string // base64 sin prefijo
  preview: string // data URL para mostrar
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  images?: AttachedImage[]
}

const MAX_IMAGES = 4
const MAX_DIMENSION = 1568

/** Reduce la imagen en el navegador para no pasarse del límite del request. */
async function fileToAttachedImage(file: File): Promise<AttachedImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo procesar la imagen")
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
  return {
    media_type: "image/jpeg",
    data: dataUrl.split(",")[1] ?? "",
    preview: dataUrl,
  }
}

export function AiStudio({ aiConfigured }: { aiConfigured: boolean }) {
  const [task, setTask] = useState<AiTask>("libre")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [pendingImages, setPendingImages] = useState<AttachedImage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeTask = AI_TASKS.find((t) => t.id === task) ?? AI_TASKS[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  function resetConversation(nextTask?: AiTask) {
    abortRef.current?.abort()
    setMessages([])
    setPendingImages([])
    setStreaming(false)
    if (nextTask) setTask(nextTask)
  }

  async function attachFiles(files: FileList | null) {
    if (!files?.length) return
    const room = MAX_IMAGES - pendingImages.length
    const selected = Array.from(files).slice(0, room)
    if (files.length > room) toast.warning(`Máximo ${MAX_IMAGES} imágenes por mensaje`)
    try {
      const processed = await Promise.all(selected.map(fileToAttachedImage))
      setPendingImages((prev) => [...prev, ...processed])
    } catch {
      toast.error("No se pudo procesar una de las imágenes")
    }
  }

  async function send() {
    const text = input.trim()
    if ((!text && pendingImages.length === 0) || streaming) return

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      images: pendingImages.length ? pendingImages : undefined,
    }
    const history = [...messages, userMessage]
    setMessages([...history, { role: "assistant", content: "" }])
    setInput("")
    setPendingImages([])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          task,
          messages: history.slice(-12).map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images?.map(({ media_type, data }) => ({ media_type, data })),
          })),
        }),
      })

      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? `Error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const current = acc
        setMessages([...history, { role: "assistant", content: current }])
      }
      if (!acc.trim()) throw new Error("La AI no devolvió contenido")
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message || "Error hablando con la AI")
        setMessages(history) // quita el mensaje vacío del asistente
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      {/* Selector de tarea */}
      <div className="flex flex-wrap items-center gap-2">
        {AI_TASKS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => task !== t.id && resetConversation(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
              task === t.id
                ? "border-primary bg-primary/15 font-medium text-foreground shadow-[0_0_0_1px_hsl(var(--primary))]"
                : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => resetConversation()}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Nueva conversación
          </Button>
        )}
      </div>

      {/* Conversación */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-card/50 p-4">
        {messages.length === 0 ? (
          <EmptyState task={task} aiConfigured={aiConfigured} onPick={(t) => resetConversation(t)} />
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={i}
              message={m}
              streaming={streaming && i === messages.length - 1}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        {pendingImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((img, i) => (
              <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border">
                <Image src={img.preview} alt="" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Quitar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void attachFiles(e.target.files)
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("shrink-0", activeTask.wantsImages && "text-primary")}
            onClick={() => fileRef.current?.click()}
            title="Adjuntar imágenes"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Textarea
            rows={1}
            value={input}
            placeholder={activeTask.placeholder}
            className="max-h-40 min-h-[42px] flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          {streaming ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => abortRef.current?.abort()}
              title="Detener"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              disabled={!input.trim() && pendingImages.length === 0}
              onClick={() => void send()}
              title="Enviar"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  task,
  aiConfigured,
  onPick,
}: {
  task: AiTask
  aiConfigured: boolean
  onPick: (task: AiTask) => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 shadow-[0_0_40px_-8px_hsl(var(--primary))]">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold">AI Studio</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {aiConfigured
            ? "Hooks, guiones, landings completas y código Liquid para Shopify — con las fotos que subas como contexto."
            : "Falta configurar ANTHROPIC_API_KEY en las variables de entorno para activar la AI."}
        </p>
      </div>
      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {AI_TASKS.filter((t) => t.id !== "libre").map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md",
              task === t.id && "border-primary bg-primary/5",
            )}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <t.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage
  streaming: boolean
}) {
  const [copied, setCopied] = useState(false)

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] space-y-2">
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {message.images.map((img, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <Image src={img.preview} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group max-w-[95%]">
      <div className="rounded-2xl rounded-bl-md border bg-background px-4 py-3">
        {message.content ? (
          <Markdown content={message.content} />
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Pensando…
          </span>
        )}
      </div>
      {!streaming && message.content && (
        <button
          type="button"
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={() => {
            void navigator.clipboard.writeText(message.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="h-3 w-3 text-lumens-green" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      )}
    </div>
  )
}
