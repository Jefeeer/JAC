/** Serializable nav config shared by the portal and admin shells (icons are referenced by key). */
export type NavIconKey =
  | "dashboard"
  | "fleet"
  | "jobs"
  | "bookings"
  | "quotes"
  | "notifications"
  | "profile"
  | "trucks"
  | "parts"
  | "customers"
  | "invoices"
  | "reports"
  | "settings"

export type NavItem = {
  href: string
  label: string
  icon: NavIconKey
  exact?: boolean
  count?: number
  /** red badge for things needing action */
  alert?: boolean
}

export type NavGroup = { label: string; items: NavItem[] }
