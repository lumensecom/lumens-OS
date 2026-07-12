import Link from "next/link"
import { Plus, Clapperboard, Target } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CreativeCard } from "@/components/creativos/creative-card"
import { ModulePlaceholder } from "@/components/module-placeholder"

export default async function CreativosPage() {
  const supabase = createClient()
  const { data: creatives } = await supabase
    .from("creatives")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  // Signed URLs en lote para los thumbnails (bucket privado).
  const thumbPaths = (creatives ?? [])
    .map((c) => c.thumbnail_url)
    .filter((p): p is string => !!p)
  const { data: signed } =
    thumbPaths.length > 0
      ? await supabase.storage.from("creatives").createSignedUrls(thumbPaths, 3600)
      : { data: [] }
  const signedByPath = new Map(
    (signed ?? []).filter((s) => !s.error).map((s) => [s.path, s.signedUrl]),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">
            Creativos
          </h2>
          <p className="text-sm text-muted-foreground">
            Biblioteca de anuncios con hooks, guiones y métricas
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/creativos/angulos">
              <Target className="mr-1 h-4 w-4" />
              Por ángulo
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/creativos/nuevo">
              <Plus className="mr-1 h-4 w-4" />
              Nuevo creativo
            </Link>
          </Button>
        </div>
      </div>

      {(creatives ?? []).length === 0 ? (
        <ModulePlaceholder
          icon={Clapperboard}
          accent="red"
          title="Sin creativos"
          description="Sube tu primer video con su hook y guion para construir la biblioteca de ganadores."
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(creatives ?? []).map((c) => (
            <CreativeCard
              key={c.id}
              creative={c}
              thumbUrl={c.thumbnail_url ? (signedByPath.get(c.thumbnail_url) ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
