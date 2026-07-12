import Link from "next/link"
import { ArrowLeft, Target } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CreativeCard } from "@/components/creativos/creative-card"
import { ModulePlaceholder } from "@/components/module-placeholder"
import type { Creative } from "@/lib/types"

export default async function AngulosPage() {
  const supabase = createClient()
  const { data: creatives } = await supabase
    .from("creatives")
    .select("*")
    .neq("status", "archived")
    .order("best_roas", { ascending: false, nullsFirst: false })

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

  const groups = new Map<string, Creative[]>()
  for (const c of creatives ?? []) {
    const key = c.angle_type ?? "sin_angulo"
    groups.set(key, [...(groups.get(key) ?? []), c])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/creativos" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="page-title">
            Creativos por ángulo
          </h2>
          <p className="text-sm text-muted-foreground">
            Compara todos los creativos que usan el mismo hook
          </p>
        </div>
      </div>

      {groups.size === 0 ? (
        <ModulePlaceholder
          icon={Target}
          accent="yellow"
          title="Sin ángulos"
          description="Asigna un tipo de ángulo a tus creativos para agruparlos aquí."
        />
      ) : (
        Array.from(groups.entries()).map(([angle, items]) => (
          <div key={angle} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-mono">{angle}</span>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </h3>
            <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((c) => (
                <CreativeCard
                  key={c.id}
                  creative={c}
                  thumbUrl={c.thumbnail_url ? (signedByPath.get(c.thumbnail_url) ?? null) : null}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
