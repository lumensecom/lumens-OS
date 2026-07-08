"use client"

import { useQueryState } from "nuqs"
import { addMonths, format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Selector de mes que guarda el estado en la URL (?mes=YYYY-MM). */
export function MonthSelector({ current }: { current: string }) {
  const [mes, setMes] = useQueryState("mes", {
    defaultValue: current,
    shallow: false,
  })

  const value = mes || current
  const date = parse(`${value}-01`, "yyyy-MM-dd", new Date())

  function shift(delta: number) {
    setMes(format(addMonths(date, delta), "yyyy-MM"))
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => shift(-1)}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[150px] text-center text-sm font-medium capitalize">
        {format(date, "MMMM yyyy", { locale: es })}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => shift(1)}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
