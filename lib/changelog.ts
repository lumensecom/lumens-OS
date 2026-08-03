export type ChangeTag = "nuevo" | "mejora" | "arreglo"

export type ChangelogEntry = {
  date: string // ISO
  tag: ChangeTag
  title: string
  description: string
}

/**
 * Novedades de LUMENS OS — se muestran en el panel principal.
 * Lo más reciente primero.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-03",
    tag: "nuevo",
    title: "Panel principal como hub central",
    description:
      "El inicio ahora es un menú visual para saltar a cualquier herramienta, con métricas clave y este panel de novedades.",
  },
  {
    date: "2026-08-03",
    tag: "mejora",
    title: "Rediseño premium de toda la app",
    description:
      "Nuevo sidebar y topbar, botones con gradiente de marca, tablas y tarjetas más legibles, animaciones y transiciones suaves.",
  },
  {
    date: "2026-08-02",
    tag: "nuevo",
    title: "Llamadas IA con estados y análisis",
    description:
      "Los pedidos se agrupan por estado (por llamar, en cola, confirmados, reagendar, recontacto), puedes leer el análisis de cada llamada y hay una barra flotante para llamar sin scrollear.",
  },
  {
    date: "2026-08-02",
    tag: "nuevo",
    title: "Juliana confirma pedidos por voz",
    description:
      "Agente de voz conectado por Dapta: llama a los clientes, confirma el pedido y el resultado vuelve a LUMENS OS automáticamente.",
  },
  {
    date: "2026-08-02",
    tag: "nuevo",
    title: "Generador de mensajes de WhatsApp",
    description:
      "Pega el listado de Dropi y genera mensajes personalizados de confirmación, recoger en oficina o devolución.",
  },
  {
    date: "2026-08-01",
    tag: "nuevo",
    title: "Análisis Dropi",
    description:
      "Sube el reporte .xlsx y obtén KPIs reales, utilidad neta con tu inversión en publicidad y la lista de pedidos por confirmar.",
  },
  {
    date: "2026-07-30",
    tag: "nuevo",
    title: "AI Studio con visión",
    description:
      "Genera hooks, guiones, landings completas y código Liquid de Shopify; sube fotos como contexto.",
  },
  {
    date: "2026-07-29",
    tag: "nuevo",
    title: "Costeo completo y tabla estilo Excel",
    description:
      "Productos con fulfillment, CPA, admin y regla de precio; tabla de costeo con semáforo y venta mínima.",
  },
]
