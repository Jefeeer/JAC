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
