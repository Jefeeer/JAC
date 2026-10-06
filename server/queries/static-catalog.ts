import "server-only"

import * as sample from "@/lib/data/seed-data"
import { stockStatusFor, type Part, type PartCategory, type Service, type Truck } from "@/types/domain"

/** Static sample catalog (mirrors supabase/seed.sql). Used offline and to seed DEMO MODE. */
export const staticTrucks: Truck[] = sample.trucks.map((t, i) => ({
  ...t,
  id: `sample-truck-${i}`,
  currency: "PHP",
  isPublished: true,
}))

export const staticParts: Part[] = sample.parts.map((p, i) => ({
  ...p,
  id: `sample-part-${i}`,
  currency: "PHP",
  isPublished: true,
  stockStatus: stockStatusFor(p.stockQty, p.reorderLevel),
}))

export const staticCategories: PartCategory[] = sample.partCategories.map((c, i) => ({ ...c, id: `sample-cat-${i}` }))

export const staticServices: Service[] = sample.services.map((s, i) => ({ ...s, id: `sample-service-${i}` }))
