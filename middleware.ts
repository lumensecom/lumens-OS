import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - /api (cada route handler hace su propia autenticación:
     *   /api/ai valida sesión Supabase, /api/webhooks/* valida secreto)
     * - _next/static, _next/image (assets)
     * - favicon y archivos estáticos comunes
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
