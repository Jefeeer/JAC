import type { UserRole } from "@/types/domain"

/**
 * DEMO MODE — fictional personas for exploring the portal and admin panel
 * before Supabase is connected. Enabled only with NEXT_PUBLIC_DEMO_MODE=1.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1"

export type DemoAccount = {
  id: string
  email: string
  fullName: string
  phone: string
  role: UserRole
  title: string
  blurb: string
  branchSlug: string | null
  home: "/account" | "/admin"
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    email: "ana.reyes@demo.jacmotors.ph",
    fullName: "Ana Reyes",
    phone: "0917 555 0101",
    role: "customer",
    title: "Fleet customer",
    blurb: "Runs a 4-truck cold-chain fleet — one truck in the bay right now.",
    branchSlug: null,
    home: "/account",
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    email: "ben.santos@demo.jacmotors.ph",
    fullName: "Ben Santos",
    phone: "0918 555 0202",
    role: "customer",
    title: "Single-truck owner",
    blurb: "One used HFC1061 and a pending booking.",
    branchSlug: null,
    home: "/account",
  },
  {
    id: "00000000-0000-4000-b000-000000000001",
    email: "carla.admin@demo.jacmotors.ph",
    fullName: "Carla Mendoza",
    phone: "0917 555 1001",
    role: "admin",
    title: "Admin",
    blurb: "Full access — inventory, quotes, workshop, customers.",
    branchSlug: "north-edsa",
    home: "/admin",
  },
  {
    id: "00000000-0000-4000-b000-000000000002",
    email: "jun.advisor@demo.jacmotors.ph",
    fullName: "Jun Dela Cruz",
    phone: "0917 555 1002",
    role: "service_advisor",
    title: "Service advisor",
    blurb: "Confirms bookings, opens job orders, assigns mechanics.",
    branchSlug: "north-edsa",
    home: "/admin",
  },
  {
    id: "00000000-0000-4000-b000-000000000003",
    email: "rico.mechanic@demo.jacmotors.ph",
    fullName: "Rico Bautista",
    phone: "0917 555 1003",
    role: "mechanic",
    title: "Mechanic",
    blurb: "Sees only assigned jobs; moves them through the stages.",
    branchSlug: "north-edsa",
    home: "/admin",
  },
  {
    id: "00000000-0000-4000-b000-000000000004",
    email: "mika.sales@demo.jacmotors.ph",
    fullName: "Mika Tan",
    phone: "0917 555 1004",
    role: "sales",
    title: "Sales",
    blurb: "Truck inventory and truck quotes.",
    branchSlug: "a-bonifacio",
    home: "/admin",
  },
  {
    id: "00000000-0000-4000-b000-000000000005",
    email: "leo.parts@demo.jacmotors.ph",
    fullName: "Leo Garcia",
    phone: "0917 555 1005",
    role: "parts",
    title: "Parts counter",
    blurb: "Parts catalog, stock levels and parts quotes.",
    branchSlug: "north-edsa",
    home: "/admin",
  },
]

export const demoAccount = (id: string | undefined | null) => DEMO_ACCOUNTS.find((a) => a.id === id) ?? null
