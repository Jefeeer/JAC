import type { QuoteType, UserRole } from "@/types/domain"

/**
 * Admin capability matrix. Mirrors the RLS policies in
 * supabase/migrations/20261006000200_security_rls.sql so the UI only offers
 * what the database will accept (RLS remains the real enforcement).
 */
export const CAN = {
  "trucks.read": ["admin", "sales", "parts", "service_advisor", "mechanic"],
  "trucks.write": ["admin", "sales"],
  "trucks.delete": ["admin"],
  "parts.read": ["admin", "sales", "parts", "service_advisor", "mechanic"],
  "parts.write": ["admin", "parts"],
  "quotes.read": ["admin", "sales", "parts", "service_advisor"],
  "quotes.write": ["admin", "sales", "parts", "service_advisor"],
  "bookings.read": ["admin", "service_advisor", "sales"],
  "bookings.write": ["admin", "service_advisor"],
  "jobs.read": ["admin", "service_advisor", "parts", "sales", "mechanic"],
  "jobs.write": ["admin", "service_advisor"],
  "jobs.items": ["admin", "service_advisor", "parts", "mechanic"],
  "jobs.status": ["admin", "service_advisor", "mechanic"],
  "invoices.write": ["admin", "sales", "parts", "service_advisor"],
  "customers.read": ["admin", "sales", "parts", "service_advisor"],
  "reports.read": ["admin", "sales", "parts"],
} as const satisfies Record<string, readonly UserRole[]>

export type Capability = keyof typeof CAN

export function can(role: UserRole, cap: Capability) {
  return (CAN[cap] as readonly UserRole[]).includes(role)
}

/** Which quote types each role works by default (admin sees all). */
export function quoteTypesFor(role: UserRole): QuoteType[] | null {
  if (role === "sales") return ["truck"]
  if (role === "parts") return ["part"]
  if (role === "service_advisor") return ["service"]
  return null
}

/** Mechanics may only move a job forward through workshop stages. */
export const MECHANIC_STATUSES = ["diagnosing", "awaiting_parts", "in_progress", "ready"] as const

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  admin: "Admin",
  sales: "Sales",
  parts: "Parts counter",
  service_advisor: "Service advisor",
  mechanic: "Mechanic",
}
