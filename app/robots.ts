import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/config/site"
import { DEMO_MODE } from "@/lib/demo/accounts"

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "")
  // Preview deployments and DEMO MODE (sample data) are never indexed.
  const production = !DEMO_MODE && (process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production")
  return {
    rules: production
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/auth/", "/login", "/*?*sort=", "/*?*page="] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
