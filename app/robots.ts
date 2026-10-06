import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/config/site"

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "")
  // Preview / staging deployments should never be indexed.
  const production = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production"
  return {
    rules: production
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/auth/", "/login", "/*?*sort=", "/*?*page="] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
