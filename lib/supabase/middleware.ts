import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

/**
 * Refresca la sesión de Supabase en cada request y aplica las reglas de acceso:
 * - Sin sesión y ruta privada  → redirige a /login
 * - Con sesión y ruta de login  → redirige al dashboard
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLogin = pathname === "/login"

  if ((!user && !isLogin) || (user && isLogin)) {
    const url = new URL(user ? "/" : "/login", request.url)
    const redirectResponse = NextResponse.redirect(url)
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie)
    }
    redirectResponse.headers.set("Cache-Control", "private, no-store")
    return redirectResponse
  }

  return supabaseResponse
}
