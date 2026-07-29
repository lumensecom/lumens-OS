import { LlamadasModule } from "@/components/llamadas/llamadas-module"

export const metadata = { title: "Llamadas IA · LUMENS OS" }

export default function LlamadasPage() {
  return <LlamadasModule configured={Boolean(process.env.DAPTA_FLOW_WEBHOOK_URL)} />
}
