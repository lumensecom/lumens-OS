"use client"

import { useRef, useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createProduct, updateProduct } from "@/app/(dashboard)/productos/actions"
import { productSchema, slugify, type ProductInput, PRODUCT_STATUSES } from "@/lib/productos"
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
import { PricingCalculator } from "@/components/productos/pricing-calculator"
import { MainImageUpload, GalleryUpload } from "@/components/productos/image-upload"

type Props = {
  productId?: string
  defaultValues?: Partial<ProductInput>
}

const EMPTY: ProductInput = {
  name: "", slug: "", status: "testing",
  selling_price: 0, compared_price: undefined, cost_dropi: 0, shipping_cost: 0,
  fulfillment_cost: 0, cpa_real: undefined, admin_cost: 2000, price_rule_pct: 50,
  landing_url: "", shopify_product_id: "", dropi_product_id: "",
  description: "", main_image_url: null, gallery: [],
  best_angle: "", target_audience: "",
}

export function ProductForm({ productId, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition()
  const slugTouched = useRef(!!productId)

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as unknown as Resolver<ProductInput>,
    defaultValues: { ...EMPTY, ...defaultValues },
  })

  const [selling, cost, shipping, fulfillment, cpaReal, admin, rulePct] = form.watch([
    "selling_price", "cost_dropi", "shipping_cost",
    "fulfillment_cost", "cpa_real", "admin_cost", "price_rule_pct",
  ])

  function onSubmit(values: ProductInput) {
    startTransition(async () => {
      const res = productId
        ? await updateProduct(productId, values)
        : await createProduct(values)
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
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => {
                      field.onChange(e)
                      if (!slugTouched.current) form.setValue("slug", slugify(e.target.value))
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => { slugTouched.current = true; field.onChange(e) }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="landing_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de landing</FormLabel>
                  <FormControl><Input placeholder="/products/..." {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="shopify_product_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Shopify ID (para integración futura)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="dropi_product_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dropi ID (para integración futura)</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precios y costeo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                ["selling_price", "Precio de venta"],
                ["compared_price", "Precio tachado"],
                ["cost_dropi", "Costo del producto"],
                ["shipping_cost", "Flete / envío"],
                ["fulfillment_cost", "Fulfillment"],
                ["cpa_real", "Publicidad (CPA)"],
                ["admin_cost", "Costo admin"],
                ["price_rule_pct", "Regla precio (%)"],
              ] as const).map(([name, label]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" placeholder="0" {...field}
                        value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </div>
            <PricingCalculator
              selling={Number(selling)}
              cost={Number(cost)}
              shipping={Number(shipping)}
              fulfillment={Number(fulfillment)}
              cpaReal={cpaReal == null || cpaReal === undefined ? 0 : Number(cpaReal)}
              admin={Number(admin)}
              rulePct={Number(rulePct)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Imágenes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="main_image_url" render={({ field }) => (
              <FormItem>
                <FormLabel>Imagen principal</FormLabel>
                <MainImageUpload value={field.value ?? null} onChange={field.onChange} />
              </FormItem>
            )} />
            <FormField control={form.control} name="gallery" render={({ field }) => (
              <FormItem>
                <FormLabel>Galería</FormLabel>
                <GalleryUpload value={field.value ?? []} onChange={field.onChange} />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contenido y ángulos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (markdown)</FormLabel>
                <FormControl><Textarea rows={5} {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="best_angle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mejor ángulo validado</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="target_audience" render={({ field }) => (
                <FormItem>
                  <FormLabel>Audiencia objetivo</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {productId ? "Guardar cambios" : "Crear producto"}
        </Button>
      </form>
    </Form>
  )
}
