"use client"

import { useState, useTransition } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Loader2, Monitor, Moon, Sun, UserRound } from "lucide-react"

import { updateProfileName } from "@/app/(dashboard)/configuracion/actions"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

export function ProfileCard({ profile }: { profile: Profile | null }) {
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(profile?.full_name ?? "")
  const [isPending, startTransition] = useTransition()

  function saveName() {
    startTransition(async () => {
      const res = await updateProfileName(name)
      if (res?.error) toast.error(res.error)
      else toast.success("Nombre actualizado")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-primary" />
          Cuenta y apariencia
        </CardTitle>
        <CardDescription>Tu perfil y el tema de la interfaz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.email}</p>
            <Badge variant="secondary" className="mt-0.5">
              {profile?.role === "owner" ? "Owner" : "Colaborador"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="full-name">Nombre para mostrar</Label>
          <div className="flex gap-2">
            <Input
              id="full-name"
              value={name}
              placeholder="Tu nombre"
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPending || name.trim().length < 2}
              onClick={saveName}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-all hover:border-primary/60",
                  theme === t.value
                    ? "border-primary bg-primary/10 font-medium shadow-[0_0_0_1px_hsl(var(--primary))]"
                    : "text-muted-foreground",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
