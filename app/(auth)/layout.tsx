export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-lumens-black p-4">
      {/* Orbs amarillos sutiles */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lumens-yellow/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-lumens-yellow/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
