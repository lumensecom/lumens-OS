import { z } from "zod"
import { getTowerClient } from "@/lib/tower/server"

export async function GET(request: Request, { params }: { params: { id: string; version: string } }) {
  const block = new URL(request.url).searchParams.get("bloque")
  if (!z.uuid().safeParse(params.id).success || !z.uuid().safeParse(params.version).success
      || (block !== "hero" && block !== "body")) {
    return new Response(null, { status: 404 })
  }
  const client = await getTowerClient()
  const version = await client.from("tower_landings").select("hero,body,approval_id")
    .eq("id", params.version).eq("opportunity_id", params.id).maybeSingle()
  if (version.error) return new Response(null, { status: 500 })
  if (!version.data) return new Response(null, { status: 404 })
  const review = await client.from("tower_approvals").select("status")
    .eq("id", version.data.approval_id).maybeSingle()
  if (review.error) return new Response(null, { status: 500 })
  if (review.data?.status !== "approved") return new Response(null, { status: 403 })
  return new Response(version.data[block], {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${block === "hero" ? "1-producto" : "2-landing"}.txt"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
