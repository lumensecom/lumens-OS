"use client"

import { useQueryState } from "nuqs"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Selector de rango de fechas persistido en la URL (?desde=&hasta=). */
export function RangeSelector({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string
  defaultTo: string
}) {
  const [desde, setDesde] = useQueryState("desde", {
    defaultValue: defaultFrom,
    shallow: false,
  })
  const [hasta, setHasta] = useQueryState("hasta", {
    defaultValue: defaultTo,
    shallow: false,
  })

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <Label htmlFor="desde" className="text-xs text-muted-foreground">
          Desde
        </Label>
        <Input
          id="desde"
          type="date"
          className="w-auto"
          value={desde || defaultFrom}
          onChange={(e) => setDesde(e.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="hasta" className="text-xs text-muted-foreground">
          Hasta
        </Label>
        <Input
          id="hasta"
          type="date"
          className="w-auto"
          value={hasta || defaultTo}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>
    </div>
  )
}
