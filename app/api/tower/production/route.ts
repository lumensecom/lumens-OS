import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ProductionBlocked, runProduction } from "@/lib/production/pipeline"
import { createClient } from "@/lib/supabase/server"
import demoBrief from "@/lib/production/demo/brief.json"
import milanBrief from "@/lib/production/milan/brief.json"

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
    const milan = data.get("sample") === "milan"
    const example = milan ? { folder: "milan", brief: milanBrief, count: 3 } : demo ? { folder: "demo", brief: demoBrief, count: 4 } : null
    const brief = example?.brief ?? JSON.parse(String(data.get("brief") ?? ""))
    const uploads = data.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0)
    if (uploads.length > 7 || uploads.reduce((sum, file) => sum + file.size, 0) > 3_500_000) {
      throw new ProductionBlocked("Adjunta entre 1 y 7 fotos que sumen menos de 3,5 MB.")
    }
    const photos = example
      ? await Promise.all(Array.from({ length: example.count }, async (_, index) => ({
        data: await readFile(join(process.cwd(), "lib", "production", example.folder, `G${index + 1}.webp`)),
      })))
      : await Promise.all(uploads.map(async (file) => ({ data: new Uint8Array(await file.arrayBuffer()) })))
    const result = await runProduction(brief, photos, demo && !milan)
    const opportunity = data.get("opportunity")
    if (opportunity !== null) {
      const id = z.uuid().safeParse(opportunity)
      if (!id.success || example) throw new ProductionBlocked("Abre una oportunidad aprobada y usa su brief para enviar al Lobby.")
      const review = await client.rpc("tower_submit_landing", {
        target_id: id.data, hero_liquid: result.liquid.hero, body_liquid: result.liquid.body,
      })
      if (review.error?.code === "P0001") throw new ProductionBlocked(review.error.message)
      if (review.error) return Response.json({ message: "No se pudo guardar la versión en el Lobby." }, { status: 503, headers })
      revalidatePath("/torre/lobby")
      revalidatePath(`/torre/product-lab/${id.data}`)
    }
    return new Response(new Uint8Array(result.zip), {
      headers: {
        ...headers, "Content-Type": "application/zip",
        "Content-Disposition": milan ? 'attachment; filename="LUMENS-Enterizo-Milan.zip"' : 'attachment; filename="LUMENS-Produccion.zip"',
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    const message = error instanceof ProductionBlocked ? error.message
      : error instanceof SyntaxError ? "Revisa el formato del brief." : "No se pudo generar la entrega. Revisa los archivos y vuelve a intentar."
    return Response.json({ message }, { status: error instanceof ProductionBlocked || error instanceof SyntaxError ? 422 : 500, headers })
  }
}
