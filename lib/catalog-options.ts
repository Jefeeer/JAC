/**
 * Catalog option lists shared by server parsing and client filter UIs.
 * Kept free of zod so importing them doesn't pull the validator into the
 * browser bundle.
 */

export const TRUCK_SORTS = ["newest", "price-asc", "price-desc", "payload-asc", "payload-desc", "year-desc"] as const
export const TRUCK_SORT_LABELS: Record<(typeof TRUCK_SORTS)[number], string> = {
  newest: "Newest listings",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "payload-asc": "Payload: light to heavy",
  "payload-desc": "Payload: heavy to light",
  "year-desc": "Year: newest first",
}

/** Payload bands shown as chips; value is "min-max" in tonnes. */
export const PAYLOAD_BANDS = [
  { value: "0-1.5", label: "Up to 1.5 T", hint: "Pickups" },
  { value: "1.5-3.5", label: "1.5 – 3.5 T", hint: "Light duty" },
  { value: "3.5-6", label: "3.5 – 6 T", hint: "Medium" },
  { value: "6-12", label: "6 – 12 T", hint: "Medium-heavy" },
  { value: "12-40", label: "12 T +", hint: "Heavy haul" },
] as const

export const PART_SORTS = ["relevance", "name", "price-asc", "price-desc", "part-number"] as const
export const PART_SORT_LABELS: Record<(typeof PART_SORTS)[number], string> = {
  relevance: "Best match",
  name: "Name A–Z",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "part-number": "Part number",
}
