import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/config/site"
import { getPartCategories, localParts, localTrucks } from "@/server/queries/catalog"
import { createSupabasePublicClient } from "@/lib/supabase/public"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { DEMO_MODE } from "@/lib/demo/accounts"

export const revalidate = 3600

const STATIC: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
  ["/", "daily", 1],
  ["/trucks", "daily", 0.9],
  ["/parts", "daily", 0.9],
  ["/services", "monthly", 0.8],
  ["/book-service", "monthly", 0.8],
  ["/after-sales", "monthly", 0.7],
  ["/about", "yearly", 0.5],
  ["/contact", "yearly", 0.7],
  ["/privacy", "yearly", 0.2],
  ["/terms", "yearly", 0.2],
]

type Row = { slug: string; updated_at: string }

async function catalogRows(): Promise<{ trucks: Row[]; parts: Row[] }> {
  if (isSupabaseConfigured && !DEMO_MODE) {
    const sb = createSupabasePublicClient()
    const [t, p] = await Promise.all([
      sb.from("trucks").select("slug, updated_at").eq("is_published", true).limit(5000),
      sb.from("parts").select("slug, updated_at").eq("is_published", true).limit(20000),
    ])
    if (!t.error && !p.error) return { trucks: t.data ?? [], parts: p.data ?? [] }
  }
  const now = new Date().toISOString()
  return {
    trucks: localTrucks().map((t) => ({ slug: t.slug, updated_at: now })),
    parts: localParts().map((p) => ({ slug: p.slug, updated_at: now })),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "")
  const [{ trucks, parts }, categories] = await Promise.all([catalogRows(), getPartCategories()])
  const now = new Date()
  return [
    ...STATIC.map(([path, changeFrequency, priority]) => ({ url: `${base}${path === "/" ? "" : path}`, lastModified: now, changeFrequency, priority })),
    ...categories.filter((c) => c.count > 0).map((c) => ({ url: `${base}/parts?category=${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...trucks.map((t) => ({ url: `${base}/trucks/${t.slug}`, lastModified: new Date(t.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...parts.map((p) => ({ url: `${base}/parts/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.6 })),
  ]
}
