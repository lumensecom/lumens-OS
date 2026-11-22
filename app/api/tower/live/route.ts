import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { getTowerSnapshot } from "@/lib/tower/live"

export const dynamic = "force-dynamic"

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" }

export async function GET(request: Request) {
  try {
    const client = createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error?.name === "AuthRetryableFetchError" || (error?.status ?? 0) >= 500) {
      return Response.json({ message: "No se pudo verificar la sesión." }, { status: 503, headers })
    }
    if (error || !user) {
      return Response.json({ message: "Inicia sesión para ver la torre." }, { status: 401, headers })
    }

    const owner = await client.rpc("is_owner")
    if (owner.error) {
      return Response.json({ message: "No se pudo verificar el acceso a la torre." }, { status: 503, headers })
    }
    if (!owner.data) {
      return Response.json({ message: "Solo el propietario puede ver la torre." }, { status: 403, headers })
    }

    const body = JSON.stringify(await getTowerSnapshot(client))
    const etag = `"${createHash("sha256").update(body).digest("base64url")}"`
    const validators = request.headers.get("if-none-match")?.split(",").map((value) => value.trim().replace(/^W\//, ""))
    if (validators?.some((value) => value === etag || value === "*")) {
      return new Response(null, { status: 304, headers: { ...headers, ETag: etag } })
    }
    return new Response(body, {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8", ETag: etag },
    })
  } catch {
    return Response.json({ message: "No se pudo actualizar la torre." }, { status: 503, headers })
  }
}
