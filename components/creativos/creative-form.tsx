"use client"

import { useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createCreative, updateCreative } from "@/app/(dashboard)/creativos/actions"
import {
  creativeSchema, type CreativeInput,
  CREATIVE_STATUSES, CREATIVE_PLATFORMS, CREATIVE_PLATFORM_LABELS,
} from "@/lib/creativos"
import { STATUS_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { VideoUploader } from "@/components/creativos/video-uploader"
import type { ProductOption } from "@/components/contabilidad/add-revenue-dialog"

type Props = {
  creativeId?: string
  products: ProductOption[]
  defaultValues?: Partial<CreativeInput>
}

const EMPTY: CreativeInput = {
  name: "", product_id: "none", platform: "meta", status: "testing",
  video_url: null, thumbnail_url: null, duration_seconds: undefined,
  hook: "", script: "", cta: "", music_ref: "", angle_type: "",
  total_spend: undefined, total_conversions: undefined,
  best_cpa: undefined, best_roas: undefined, best_ctr: undefined,
  notes: "",
}

export function CreativeForm({ creativeId, products, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreativeInput>({
    resolver: zodResolver(creativeSchema) as unknown as Resolver<CreativeInput>,
    defaultValues: { ...EMPTY, ...defaultValues },
  })

  function onSubmit(values: CreativeInput) {
    startTransition(async () => {
      const res = creativeId
        ? await updateCreative(creativeId, values)
        : await createCreative(values)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Video y básicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <VideoUploader
              currentPath={form.getValues("video_url")}
              onUploaded={({ videoPath, thumbnailPath, durationSeconds }) => {
                form.setValue("video_url", videoPath)
                form.setValue("thumbnail_url", thumbnailPath)
                form.setValue("duration_seconds", durationSeconds)
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl><Input placeholder={'C3 - "Mi novio no es el típico"'} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="product_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CREATIVE_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{CREATIVE_PLATFORM_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CREATIVE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="angle_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ángulo</FormLabel>
                  <FormControl>
                    <Input placeholder="hombre_regalando" {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Estructura del creativo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="hook" render={({ field }) => (
              <FormItem>
                <FormLabel>Hook (primeros 3 segundos)</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="script" render={({ field }) => (
              <FormItem>
                <FormLabel>Guion completo</FormLabel>
                <FormControl><Textarea rows={6} {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="cta" render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA</FormLabel>
                  <FormControl><Input placeholder="Pide el tuyo con pago contra entrega" {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="music_ref" render={({ field }) => (
                <FormItem>
                  <FormLabel>Música de referencia</FormLabel>
                  <FormControl><Input placeholder="Ed Sheeran - Perfect" {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Métricas acumuladas (manual)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([
              ["total_spend", "Gasto total"],
              ["total_conversions", "Conversiones"],
              ["best_cpa", "Mejor CPA"],
              ["best_roas", "Mejor ROAS"],
              ["best_ctr", "Mejor CTR %"],
            ] as const).map(([name, label]) => (
              <FormField key={name} control={form.control} name={name} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{label}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" step="any" placeholder="0" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {creativeId ? "Guardar cambios" : "Crear creativo"}
        </Button>
      </form>
    </Form>
  )
}
