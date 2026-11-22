import type { Metadata } from "next"
import localFont from "next/font/local"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants"
import "./globals.css"

const syne = localFont({
  src: "./fonts/syne.ttf",
  weight: "700 800",
  variable: "--font-syne",
  display: "swap",
})

const dmSans = localFont({
  src: "./fonts/dm-sans.ttf",
  weight: "400 700",
  variable: "--font-dm-sans",
  display: "swap",
})

const dmMono = localFont({
  src: [
    { path: "./fonts/dm-mono-400.ttf", weight: "400" },
    { path: "./fonts/dm-mono-500.ttf", weight: "500" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          syne.variable,
          dmSans.variable,
          dmMono.variable,
          "font-sans antialiased",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
