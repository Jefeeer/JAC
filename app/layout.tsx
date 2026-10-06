import type { Metadata, Viewport } from "next"
import { Archivo, Big_Shoulders, JetBrains_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import { siteConfig } from "@/lib/config/site"
import { DEMO_MODE } from "@/lib/demo/accounts"
import "./globals.css"

const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
  adjustFontFallback: false,
})

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  // small labels only; keep it off the critical path
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} Philippines — Trucks, Genuine Parts & Service`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "JAC Motors",
    "JAC trucks Philippines",
    "JAC N-Series",
    "JAC T8 Pro",
    "truck dealer Quezon City",
    "truck spare parts Philippines",
    "truck repair Manila",
    "preventive maintenance trucks",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    url: siteConfig.url,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  // sample data must not end up in search results
  ...(DEMO_MODE ? { robots: { index: false, follow: false } } : {}),
}

export const viewport: Viewport = {
  // The site opens in light mode regardless of OS preference (dark is opt-in via the toggle)
  themeColor: "#f2f0eb",
  colorScheme: "light dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      suppressHydrationWarning
      className={`${shoulders.variable} ${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
