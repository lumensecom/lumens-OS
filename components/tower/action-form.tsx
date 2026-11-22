"use client"

import { useFormState, useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type ActionState = { ok: boolean; message: string }

export function TowerForm({ action, children }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>
  children: React.ReactNode
}) {
  const [state, submit] = useFormState(action, { ok: true, message: "" })
  return (
    <form action={submit} className="space-y-3">
      {children}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}
    </form>
  )
}

export function TowerSubmit({ children, name, value, secondary }: {
  children: React.ReactNode; name?: string; value?: string; secondary?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" name={name} value={value} disabled={pending} size="sm" variant={secondary ? "outline" : "default"}>
      {children}
    </Button>
  )
}
