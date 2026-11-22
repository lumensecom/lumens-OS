import type { Json } from "@/lib/database.types"

export const floors = [
  ["PH", "Dirección", "Coordinación de la operación"],
  ["7", "Métricas y finanzas", "Pauta, recaudo y utilidad"],
  ["6", "Operaciones", "Pedidos, entregas y reseñas"],
  ["5", "Lanzamiento", "Campañas y control de calidad"],
  ["4", "Creativos", "Estrategia y producción visual"],
  ["3", "Oferta y landing", "Packs, precio y página de producto"],
  ["2", "Validación", "Demanda, margen y cumplimiento"],
  ["1", "Radar", "Oportunidades y temporadas"],
] as const

export const stages = {
  detectada: "Detectada",
  en_validacion: "En validación",
  pendiente_aprobacion: "Por aprobar",
  aprobada: "Aprobada",
  descartada: "Descartada",
} as const

export type Agent = { code: string; floor: string; name: string; mission: string }
export type Routine = {
  code: string
  agent_code: string
  name: string
  cadence: "scheduled" | "event" | "manual"
  local_minutes: number[]
  weekdays: number[]
  time_note: string | null
  enabled: boolean
  enabled_since: string
}
export type Run = {
  id: string
  routine_code: string
  scheduled_for: string | null
  started_at: string
  finished_at: string | null
  status: "running" | "success" | "blocked" | "error"
  output: Json
}
export type Opportunity = {
  id: string
  title: string
  problem: string
  country: string
  stage: keyof typeof stages
  assessment: Json | null
  created_at: string
}
export type Evidence = {
  id: string
  opportunity_id: string
  source_url: string
  observation: string
  kind: "observado" | "estimado" | "hipotesis"
  captured_on: string
}
export type Approval = {
  id: string
  opportunity_id: string
  title: string
  kind: string
  payload: Json
  status: "pending" | "approved" | "rejected"
  created_at: string
  decided_at: string | null
  comment: string | null
}
export type Alert = {
  code: string
  routine_code: string
  severity: "critical" | "warning"
  message: string
  updated_at: string
  resolved_at: string | null
}
export type StageChange = {
  id: string
  opportunity_id: string
  stage: keyof typeof stages
  author_id: string
  comment: string | null
  recorded_at: string
}

type ReadOnlyTable<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] }

export type TowerTables = {
  tower_agents: ReadOnlyTable<Agent>
  tower_routines: ReadOnlyTable<Routine>
  tower_runs: ReadOnlyTable<Run>
  tower_opportunities: ReadOnlyTable<Opportunity>
  tower_evidence: ReadOnlyTable<Evidence>
  tower_approvals: ReadOnlyTable<Approval>
  tower_alerts: ReadOnlyTable<Alert>
  tower_landings: ReadOnlyTable<{ id: string; opportunity_id: string; approval_id: string; hero: string; body: string; created_at: string }>
  tower_stage_history: ReadOnlyTable<StageChange>
}

type Rpc<Args, Returns> = { Args: Args; Returns: Returns }

export type TowerFunctions = {
  tower_receive_shopify_order: Rpc<{
    order_id: string; order_created_at: string; order_quantity: number | null
    order_currency: string | null; order_total_cop: number | null
  }, boolean>
  tower_run_now: Rpc<{ routine_code: string }, Run["status"] | "inactive">
  tower_set_routine: Rpc<{ target_code: string; active: boolean }, boolean>
  tower_create_opportunity: Rpc<{ product_title: string; problem_text: string; market_country: string }, string>
  tower_add_evidence: Rpc<{
    target_id: string; link: string; evidence_text: string; evidence_kind: Evidence["kind"]; observed_on: string
  }, undefined>
  tower_request_review: Rpc<{
    target_id: string; pack_qty: number; pack_price: number; unit_cost: number; variable_cost: number
    stock: number; compliance_evidence_id: string; supplier_evidence_id: string; demand_evidence_id: string; compliance_verified: boolean
  }, string>
  tower_submit_landing: Rpc<{ target_id: string; hero_liquid: string; body_liquid: string }, string>
  tower_decide_review: Rpc<{ review_id: string; decision: "approved" | "rejected"; rationale: string }, boolean>
}
