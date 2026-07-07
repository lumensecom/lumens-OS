import type { Metadata } from "next"
import { Syne, DM_Sans, DM_Mono } from "next/font/google"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
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
    <html lang="es">
      <body
        className={cn(
          syne.variable,
          dmSans.variable,
          dmMono.variable,
          "font-sans antialiased",
        )}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
