"use client"

import { useRef, useTransition } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createArticle, updateArticle } from "@/app/(dashboard)/conocimiento/actions"
import { articleSchema, parseTags, type ArticleInput } from "@/lib/conocimiento"
import { slugify } from "@/lib/productos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Markdown } from "@/components/conocimiento/markdown"

type CategoryOption = { id: string; name: string }

type Props = {
  articleId?: string
  categories: CategoryOption[]
  defaultValues?: Partial<ArticleInput>
}

export function ArticleEditor({ articleId, categories, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition()
  const slugTouched = useRef(!!articleId)

  const form = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema) as unknown as Resolver<ArticleInput>,
    defaultValues: {
      title: "", slug: "", category_id: categories[0]?.id ?? "",
      content: "", tags: [], is_pinned: false,
      ...defaultValues,
    },
  })

  const content = form.watch("content") ?? ""

  function onSubmit(values: ArticleInput) {
    startTransition(async () => {
      const res = articleId
        ? await updateArticle(articleId, values)
        : await createArticle(values)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
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

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField control={form.control} name="category_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="tags" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Tags (separados por coma)</FormLabel>
              <FormControl>
                <Input
                  defaultValue={(field.value ?? []).join(", ")}
                  onChange={(e) => field.onChange(parseTags(e.target.value))}
                  placeholder="research, hooks, plantilla"
                />
              </FormControl>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="is_pinned" render={({ field }) => (
          <FormItem className="flex items-center gap-2 space-y-0">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4 accent-[#F5C518]"
              />
            </FormControl>
            <FormLabel className="!mt-0 cursor-pointer">Fijar arriba (pineado)</FormLabel>
          </FormItem>
        )} />

        <FormField control={form.control} name="content" render={({ field }) => (
          <FormItem>
            <FormLabel>Contenido</FormLabel>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Escribir</TabsTrigger>
                <TabsTrigger value="preview">Vista previa</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <FormControl>
                  <Textarea
                    rows={18}
                    className="font-mono text-[13px]"
                    placeholder={"# Título\n\nEscribe en **markdown**..."}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[200px] rounded-md border p-4">
                  {content.trim() ? (
                    <Markdown content={content} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nada que previsualizar.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </FormItem>
        )} />

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {articleId ? "Guardar cambios" : "Publicar artículo"}
        </Button>
      </form>
    </Form>
  )
}
