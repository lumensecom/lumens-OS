import "server-only"

export function julianaConfig() {
  const endpoint = URL.parse(process.env.DAPTA_WHATSAPP_WEBHOOK_URL ?? "")
  const secret = process.env.DAPTA_WHATSAPP_WEBHOOK_SECRET
  if (endpoint?.protocol !== "https:" || endpoint.username || endpoint.password || !secret
      || !process.env.DAPTA_WHATSAPP_RESULT_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return { endpoint, secret }
}
