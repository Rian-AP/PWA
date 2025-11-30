import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { PWAInitializer } from "@/components/pwa-initializer"
import { SessionProvider } from "@/components/session-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AnimeLib - Смотреть аниме",
  description: "Смотрите аниме онлайн с высоким качеством",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  manifest: "/manifest.json",
  generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`font-sans antialiased bg-background text-foreground`}>
        <PWAInitializer />
        <SessionProvider>
          <FavoritesProvider>
            {children}
          </FavoritesProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
