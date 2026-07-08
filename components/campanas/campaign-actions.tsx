"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import {
  updateCampaignStatus,
  deleteCampaign,
} from "@/app/(dashboard)/campanas/actions"
import { STATUS_LABELS } from "@/lib/constants"
import { CAMPAIGN_STATUSES } from "@/lib/campanas"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Selector de estado + eliminar campaña. */
export function CampaignActions({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function onStatusChange(next: string) {
    startTransition(async () => {
      const res = await updateCampaignStatus(id, next)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Estado: ${STATUS_LABELS[next] ?? next}`)
      router.refresh()
    })
  }

  function onDelete() {
    if (!window.confirm("¿Eliminar esta campaña y todas sus métricas?")) return
    startTransition(async () => {
      const res = await deleteCampaign(id)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={onStatusChange} disabled={isPending}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CAMPAIGN_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-lumens-red"
        onClick={onDelete}
        disabled={isPending}
        aria-label="Eliminar campaña"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
