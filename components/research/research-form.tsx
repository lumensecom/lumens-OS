"use client"

import { useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createResearch, updateResearch } from "@/app/(dashboard)/research/actions"
import {
  researchSchema, type ResearchInput, RESEARCH_STATUSES,
  RESEARCH_STATUS_LABELS, SOURCE_PLATFORMS, SOURCE_LABELS, CRITERIA, scoreColor,
} from "@/lib/research"
import { parseTags } from "@/lib/conocimiento"
import { formatCOP } from "@/lib/format"
import { cn } from "@/lib/utils"
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
import { MainImageUpload, GalleryUpload } from "@/components/productos/image-upload"

type Props = {
  researchId?: string
  defaultValues?: Partial<ResearchInput>
}

const EMPTY: ResearchInput = {
  name: "", status: "candidate",
  score_margin: undefined, score_demand: undefined, score_visual: undefined,
  score_logistics: undefined, score_competition: undefined,
  estimated_selling_price: undefined, estimated_cost: undefined,
  source_platform: "meta_ads_library", source_url: "",
  main_image_url: null, gallery: [], hooks_ideas: [],
  target_audience: "", notes: "",
}

export function ResearchForm({ researchId, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ResearchInput>({
    resolver: zodResolver(researchSchema) as unknown as Resolver<ResearchInput>,
    defaultValues: { ...EMPTY, ...defaultValues },
  })

  const watched = form.watch()
  const total =
    (Number(watched.score_margin) || 0) + (Number(watched.score_demand) || 0) +
    (Number(watched.score_visual) || 0) + (Number(watched.score_logistics) || 0) +
    (Number(watched.score_competition) || 0)
  const margin =
    (Number(watched.estimated_selling_price) || 0) - (Number(watched.estimated_cost) || 0)

  function onSubmit(values: ResearchInput) {
    startTransition(async () => {
      const res = researchId
        ? await updateResearch(researchId, values)
        : await createResearch(values)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Información básica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del producto</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RESEARCH_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{RESEARCH_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="source_platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descubierto en</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "otro"}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SOURCE_PLATFORMS.map((s) => (
                        <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="source_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de origen</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="main_image_url" render={({ field }) => (
              <FormItem>
                <FormLabel>Imagen principal</FormLabel>
                <MainImageUpload value={field.value ?? null} onChange={field.onChange} bucket="research" />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Los 5 criterios LUMENS
              <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-sm font-bold", scoreColor(total))}>
                {total}/50
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CRITERIA.map((c) => (
              <FormField key={c.key} control={form.control} name={c.key} render={({ field }) => (
                <FormItem>
                  <FormLabel>{c.label} (0-10)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={10} inputMode="numeric" placeholder="0" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{c.hint}</p>
                  <FormMessage />
                </FormItem>
              )} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Datos económicos estimados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="estimated_selling_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio estimado de venta</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="0" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="estimated_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo estimado</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" placeholder="0" {...field}
                      value={(field.value as number | undefined) ?? ""} />
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <p className="text-sm">
              Margen estimado:{" "}
              <span className={cn("font-mono font-medium", margin > 0 ? "text-lumens-green" : "text-lumens-red")}>
                {formatCOP(margin)}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                (= CPA máximo rentable)
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ángulos y contenido</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="hooks_ideas" render={({ field }) => (
              <FormItem>
                <FormLabel>Ideas de hooks (separadas por coma)</FormLabel>
                <FormControl>
                  <Input
                    defaultValue={(field.value ?? []).join(", ")}
                    onChange={(e) => field.onChange(parseTags(e.target.value))}
                    placeholder="Mi novio no es el típico..., Deja de sufrir por..."
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="target_audience" render={({ field }) => (
              <FormItem>
                <FormLabel>Audiencia objetivo</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="gallery" render={({ field }) => (
              <FormItem>
                <FormLabel>Galería</FormLabel>
                <GalleryUpload value={field.value ?? []} onChange={field.onChange} bucket="research" />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {researchId ? "Guardar cambios" : "Crear candidato"}
        </Button>
      </form>
    </Form>
  )
}
