import {
  Wallet, FileSpreadsheet, PhoneCall, TrendingUp, Package, BookOpen,
  Search, Clapperboard, Sparkles, Settings, ClipboardList, Users,
  type LucideIcon,
} from "lucide-react"

export type ToolAccent = "yellow" | "green" | "blue" | "purple" | "red" | "neutral"

export type Tool = {
  label: string
  href: string
  icon: LucideIcon
  description: string
  accent: ToolAccent
  soon?: boolean
}

/** Catálogo de herramientas para el hub (launcher del panel principal). */
export const TOOLS: Tool[] = [
  {
    label: "Contabilidad",
    href: "/contabilidad",
    icon: Wallet,
    description: "Ingresos, gastos, utilidad y metas del mes.",
    accent: "green",
  },
  {
    label: "Análisis Dropi",
    href: "/analisis-dropi",
    icon: FileSpreadsheet,
    description: "Sube el reporte y obtén KPIs, utilidad real y pedidos por confirmar.",
    accent: "yellow",
  },
  {
    label: "Llamadas IA · Juliana",
    href: "/llamadas",
    icon: PhoneCall,
    description: "Confirma pedidos por voz con Juliana y sigue su estado.",
    accent: "blue",
  },
  {
    label: "Campañas",
    href: "/campanas",
    icon: TrendingUp,
    description: "Métricas de Meta/TikTok, semáforo de CPA y ROAS.",
    accent: "purple",
  },
  {
    label: "Productos",
    href: "/productos",
    icon: Package,
    description: "Catálogo con costeo, margen y tabla estilo Excel.",
    accent: "yellow",
  },
  {
    label: "Conocimiento",
    href: "/conocimiento",
    icon: BookOpen,
    description: "Base de conocimiento y procesos del negocio.",
    accent: "blue",
  },
  {
    label: "Research",
    href: "/research",
    icon: Search,
    description: "Validación de productos con 5 criterios y pipeline.",
    accent: "purple",
  },
  {
    label: "Creativos",
    href: "/creativos",
    icon: Clapperboard,
    description: "Videos, hooks y ángulos ganadores.",
    accent: "red",
  },
  {
    label: "AI Studio",
    href: "/ai",
    icon: Sparkles,
    description: "Hooks, guiones, landings y Liquid de Shopify con AI.",
    accent: "yellow",
  },
  {
    label: "Pedidos",
    href: "/pedidos",
    icon: ClipboardList,
    description: "Gestión de pedidos (Fase 2).",
    accent: "neutral",
    soon: true,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
    description: "Base de clientes y recompra (Fase 2).",
    accent: "neutral",
    soon: true,
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    description: "Metas, costeo por defecto, contexto AI e integraciones.",
    accent: "neutral",
  },
]

/** Estilos por acento para las tarjetas del launcher. */
export const TOOL_ACCENT: Record<ToolAccent, { chip: string; glow: string; wash: string }> = {
  yellow: {
    chip: "bg-primary/20 text-[hsl(43_90%_35%)] dark:text-primary",
    glow: "group-hover:shadow-[0_0_28px_-6px_rgb(245_197_24/0.6)]",
    wash: "from-primary/[0.10]",
  },
  green: {
    chip: "bg-lumens-green/15 text-lumens-green",
    glow: "group-hover:shadow-[0_0_28px_-6px_rgb(34_165_91/0.55)]",
    wash: "from-lumens-green/[0.10]",
  },
  blue: {
    chip: "bg-blue-500/15 text-blue-500",
    glow: "group-hover:shadow-[0_0_28px_-6px_rgb(59_130_246/0.55)]",
    wash: "from-blue-500/[0.10]",
  },
  purple: {
    chip: "bg-lumens-purple/15 text-lumens-purple",
    glow: "group-hover:shadow-[0_0_28px_-6px_rgb(124_58_237/0.55)]",
    wash: "from-lumens-purple/[0.10]",
  },
  red: {
    chip: "bg-lumens-red/15 text-lumens-red",
    glow: "group-hover:shadow-[0_0_28px_-6px_rgb(239_68_68/0.55)]",
    wash: "from-lumens-red/[0.10]",
  },
  neutral: {
    chip: "bg-muted text-muted-foreground",
    glow: "",
    wash: "from-muted/60",
  },
}
