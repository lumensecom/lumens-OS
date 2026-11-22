import type { Json } from "@/lib/database.types"
import type { Routine, Run } from "./model"

export const statusLabels: Record<Run["status"] | "idle" | "waiting", string> = {
  idle: "En espera",
  running: "En ejecución",
  success: "Completada",
  waiting: "Por aprobar",
  blocked: "Con bloqueo",
  error: "Con error",
}

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
})

export function formatRunTime(time: string | Date) {
  return dateTime.format(new Date(time))
}

export function routineSchedule(routine: Routine) {
  if (routine.time_note) return routine.time_note
  if (routine.cadence === "event") return "Por evento"
  if (routine.cadence === "manual") return "Bajo pedido"
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const hours = routine.local_minutes.map((minute) =>
    [Math.floor(minute / 60), minute % 60].map((part) => String(part).padStart(2, "0")).join(":"),
  )
  return `${routine.weekdays.length === 7 ? "Diaria" : routine.weekdays.map((day) => days[day]).join(", ")} · ${hours.join(" y ")}`
}

export function nextRunTime(routine: Routine, now = new Date()) {
  if (!routine.enabled || routine.cadence !== "scheduled") return null
  // Colombia currently observes UTC−5 throughout the year.
  const offset = 5 * 60 * 60 * 1000
  const bogotaNow = new Date(now.getTime() - offset)
  bogotaNow.setUTCHours(0, 0, 0, 0)
  for (let days = 0; days <= 7; days++) {
    const day = new Date(bogotaNow)
    day.setUTCDate(day.getUTCDate() + days)
    if (!routine.weekdays.includes(day.getUTCDay())) continue
    for (const minute of routine.local_minutes) {
      const slot = new Date(day.getTime() + offset + minute * 60_000)
      if (slot > now) return slot
    }
  }
  return null
}

export function runMessage(output: Json) {
  if (output && typeof output === "object" && !Array.isArray(output) && typeof output.motivo === "string") {
    return output.motivo
  }
}
