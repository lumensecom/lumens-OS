import { AiStudio } from "@/components/ai/ai-studio"

export const metadata = { title: "AI Studio · LUMENS OS" }

export default function AiStudioPage() {
  return <AiStudio aiConfigured={Boolean(process.env.ANTHROPIC_API_KEY)} />
}
