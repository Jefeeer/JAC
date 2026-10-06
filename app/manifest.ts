import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/config/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.legalName,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#141518",
    theme_color: "#d7000f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Breakdown hotline", url: `tel:${siteConfig.contact.breakdownPhone}` },
      { name: "Book a service", url: "/book-service" },
      { name: "My account", url: "/account" },
    ],
  }
}
