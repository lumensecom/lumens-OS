"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const credentialsSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type AuthResult = { error?: string; message?: string }

/** Inicia sesión con email + password. Redirige al dashboard si tiene éxito. */
export async function login(values: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: "Correo o contraseña incorrectos" }

  revalidatePath("/", "layout")
  redirect("/")
}

/** Registra un usuario nuevo. El primer usuario del sistema queda como owner. */
export async function signup(values: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(values)
  if (!parsed.success) return { error: "Datos inválidos" }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) return { error: error.message }

  // Si Supabase exige confirmación de correo, no habrá sesión todavía.
  if (data.user && !data.session) {
    return { message: "Cuenta creada. Revisa tu correo para confirmarla." }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

/** Cierra la sesión y vuelve al login. */
export async function logout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
