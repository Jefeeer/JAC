const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
})

const pesoCents = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
})

const integer = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 })

export function formatPeso(value: number, opts: { cents?: boolean } = {}) {
  return (opts.cents ? pesoCents : peso).format(value)
}

/** "₱2.48M" style for tight UI (cards, scale labels). */
export function formatPesoCompact(value: number) {
  if (value >= 1_000_000) return `₱${decimal.format(value / 1_000_000)}M`
  if (value >= 1_000) return `₱${integer.format(value / 1_000)}K`
  return peso.format(value)
}

export function formatNumber(value: number) {
  return integer.format(value)
}

export function formatKm(value: number) {
  return `${integer.format(value)} km`
}

export function formatTons(value: number) {
  return `${decimal.format(value)} T`
}

export function priceLabel(item: { price: number | null; priceOnRequest: boolean }) {
  if (item.priceOnRequest || item.price === null) return "Price on request"
  return formatPeso(item.price)
}

const MANILA = "Asia/Manila"

/** "Oct 9, 2026" — accepts ISO timestamps or YYYY-MM-DD (treated as a Manila calendar date). */
export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value) : value
  return new Intl.DateTimeFormat("en-PH", { timeZone: MANILA, ...opts }).format(d)
}

/** "Oct 9, 2026, 8:30 AM" */
export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

/** "3 hours ago" style relative time (falls back to the date after a week). */
export function formatRelative(value: string | Date, now: Date = new Date()) {
  const d = typeof value === "string" ? new Date(value) : value
  const s = Math.round((now.getTime() - d.getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`
  return formatDate(d)
}
