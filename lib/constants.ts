import {
  LayoutDashboard,
  Wallet,
  FileSpreadsheet,
  TrendingUp,
  Package,
  BookOpen,
  Search,
  Clapperboard,
  ClipboardList,
  Users,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react"

/** Identidad de la app. */
export const APP_NAME = "LUMENS OS"
export const APP_DESCRIPTION = "Plataforma interna de gestión del negocio ecommerce PCE"

/** Paleta de marca (espejo de las CSS variables en globals.css). */
export const BRAND_COLORS = {
  yellow: "#F5C518",
  black: "#1A1A1A",
  beige: "#FFF8F5",
  green: "#22a55b",
  red: "#ef4444",
  purple: "#7C3AED",
} as const

/** Metas mensuales de utilidad neta (COP). */
export const GOALS = {
  metaA: 4_000_000,
  metaB: 7_000_000,
} as const

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  soon?: boolean
  /** Tinte permanente del ícono (marca visualmente el módulo). */
  accent?: "yellow"
}

/** Navegación principal del sidebar. */
export const NAV_MAIN: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Contabilidad", href: "/contabilidad", icon: Wallet },
  { label: "Análisis Dropi", href: "/analisis-dropi", icon: FileSpreadsheet, accent: "yellow" },
  { label: "Campañas", href: "/campanas", icon: TrendingUp },
  { label: "Productos", href: "/productos", icon: Package },
  { label: "Conocimiento", href: "/conocimiento", icon: BookOpen },
  { label: "Research", href: "/research", icon: Search },
  { label: "Creativos", href: "/creativos", icon: Clapperboard },
  { label: "AI Studio", href: "/ai", icon: Sparkles },
]

/** Módulos de fase 2 (aún no funcionales). */
export const NAV_SOON: NavItem[] = [
  { label: "Pedidos", href: "/pedidos", icon: ClipboardList, soon: true },
  { label: "Clientes", href: "/clientes", icon: Users, soon: true },
]

/** Sistema (siempre al final del sidebar). */
export const NAV_SYSTEM: NavItem[] = [
  { label: "Configuración", href: "/configuracion", icon: Settings },
]

/** Etiquetas legibles para categorías de gasto. */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ads_meta: "Ads Meta",
  ads_tiktok: "Ads TikTok",
  shipping: "Envíos",
  product_cost: "Costo de producto",
  refund: "Devoluciones",
  tools: "Herramientas",
  other: "Otros",
}

/** Etiquetas legibles para estados de producto/campaña. */
export const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  paused: "Pausado",
  testing: "En prueba",
  archived: "Archivado",
  winning: "Ganador",
  candidate: "Candidato",
  winner: "Ganador",
  rejected: "Rechazado",
}
