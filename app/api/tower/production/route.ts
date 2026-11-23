import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ProductionBlocked, runProduction } from "@/lib/production/pipeline"
import { createClient } from "@/lib/supabase/server"
import demoBrief from "@/lib/production/demo/brief.json"

export const runtime = "nodejs"
const limit = 3_700_000
const headers = { "Cache-Control": "private, no-store" }

export async function POST(request: Request) {
  const client = createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError?.name === "AuthRetryableFetchError" || (authError?.status ?? 0) >= 500) {
    return Response.json({ message: "No se pudo verificar la sesión." }, { status: 503, headers })
  }
  if (!user) return Response.json({ message: "Inicia sesión para generar una entrega." }, { status: 401, headers })
  const owner = await client.rpc("is_owner")
  if (owner.error) return Response.json({ message: "No se pudo verificar el acceso." }, { status: 503, headers })
  if (!owner.data) return Response.json({ message: "Acceso reservado al dueño." }, { status: 403, headers })
  if (request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers })
  if (Number(request.headers.get("content-length")) > limit) {
    return Response.json({ message: "El formulario excede 3,7 MB. Reduce el tamaño de las fotos." }, { status: 413, headers })
  }

  try {
    const data = await request.formData()
    const demo = data.get("demo") === "1"
    const brief = demo ? demoBrief : JSON.parse(String(data.get("brief") ?? ""))
    const uploads = data.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0)
    if (uploads.length > 7 || uploads.reduce((sum, file) => sum + file.size, 0) > 3_500_000) {
      throw new ProductionBlocked("Adjunta entre 1 y 7 fotos que sumen menos de 3,5 MB.")
    }
    const photos = demo
      ? await Promise.all([1, 2, 3, 4].map(async (index) => ({
        data: await readFile(join(process.cwd(), "lib", "production", "demo", `G${index}.webp`)),
      })))
      : await Promise.all(uploads.map(async (file) => ({ data: new Uint8Array(await file.arrayBuffer()) })))
    const result = await runProduction(brief, photos, demo)
    return new Response(new Uint8Array(result.zip), {
      headers: {
        ...headers, "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="LUMENS-Produccion.zip"',
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    const message = error instanceof ProductionBlocked ? error.message
      : error instanceof SyntaxError ? "Revisa el formato del brief." : "No se pudo generar la entrega. Revisa los archivos y vuelve a intentar."
    return Response.json({ message }, { status: error instanceof ProductionBlocked || error instanceof SyntaxError ? 422 : 500, headers })
  }
}
