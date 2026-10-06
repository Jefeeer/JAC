/**
 * JAC Motors Philippines branch network.
 * Addresses + phone numbers are from public listings (Oct 2026).
 * CONFIRM: opening hours are a placeholder (Mon–Sat 8:00–17:00) until each
 * branch supplies its schedule. Mirrors the `branches` table seed.
 */

export type BranchHours = {
  /** 0 = Sunday … 6 = Saturday; null = closed */
  [day: number]: { open: string; close: string } | null
}

export type Branch = {
  slug: string
  code: string
  name: string
  address: string
  city: string
  province: string
  region: "Metro Manila" | "Luzon" | "Visayas"
  phone: string | null
  phoneDisplay: string | null
  mobile: string | null
  mobileDisplay: string | null
  isHeadOffice: boolean
  services: ("sales" | "parts" | "service")[]
  hours: BranchHours
  mapQuery: string
  lat: number
  lng: number
}

const standardHours: BranchHours = {
  0: null,
  1: { open: "08:00", close: "17:00" },
  2: { open: "08:00", close: "17:00" },
  3: { open: "08:00", close: "17:00" },
  4: { open: "08:00", close: "17:00" },
  5: { open: "08:00", close: "17:00" },
  6: { open: "08:00", close: "17:00" },
}

export const branches: Branch[] = [
  {
    slug: "north-edsa",
    code: "NED",
    name: "North EDSA",
    address: "1133 EDSA, Balintawak",
    city: "Quezon City",
    province: "Metro Manila",
    region: "Metro Manila",
    phone: "+63283613333",
    phoneDisplay: "(02) 8361-3333",
    mobile: null,
    mobileDisplay: null,
    isHeadOffice: true,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors North EDSA, 1133 EDSA Balintawak Quezon City",
    lat: 14.6566,
    lng: 121.0019,
  },
  {
    slug: "a-bonifacio",
    code: "BON",
    name: "A. Bonifacio",
    address: "750–760 A. Bonifacio Ave",
    city: "Quezon City",
    province: "Metro Manila",
    region: "Metro Manila",
    phone: "+63283643333",
    phoneDisplay: "(02) 8364-3333",
    mobile: "+639081111999",
    mobileDisplay: "0908-111-1999",
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors A. Bonifacio, 750 A. Bonifacio Ave Quezon City",
    lat: 14.6402,
    lng: 120.9934,
  },
  {
    slug: "quezon-avenue",
    code: "QAV",
    name: "Quezon Avenue",
    address: "847 Quezon Ave, Heroes Hill",
    city: "Quezon City",
    province: "Metro Manila",
    region: "Metro Manila",
    phone: "+63289216666",
    phoneDisplay: "(02) 8921-6666",
    mobile: null,
    mobileDisplay: null,
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors Quezon Avenue, 847 Quezon Ave Quezon City",
    lat: 14.6337,
    lng: 121.0178,
  },
  {
    slug: "paranaque",
    code: "PQE",
    name: "Parañaque",
    address: "100 President's Ave",
    city: "Parañaque",
    province: "Metro Manila",
    region: "Metro Manila",
    phone: null,
    phoneDisplay: null,
    mobile: "+639239102832",
    mobileDisplay: "0923-910-2832",
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors Parañaque, 100 President's Ave Parañaque",
    lat: 14.4553,
    lng: 121.0244,
  },
  {
    slug: "cavite",
    code: "CAV",
    name: "Cavite",
    address: "KM 29 Emilio Aguinaldo Hwy",
    city: "Dasmariñas",
    province: "Cavite",
    region: "Luzon",
    phone: "+63464246666",
    phoneDisplay: "(046) 424-6666",
    mobile: null,
    mobileDisplay: null,
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors Cavite, KM 29 Aguinaldo Hwy Dasmariñas",
    lat: 14.3294,
    lng: 120.9367,
  },
  {
    slug: "pampanga",
    code: "PAM",
    name: "Pampanga",
    address: "CDCP, MacArthur Hwy",
    city: "San Simon",
    province: "Pampanga",
    region: "Luzon",
    phone: "+63456495913",
    phoneDisplay: "(045) 649-5913",
    mobile: null,
    mobileDisplay: null,
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors Pampanga, MacArthur Hwy San Simon Pampanga",
    lat: 14.9986,
    lng: 120.7808,
  },
  {
    slug: "tacloban",
    code: "TAC",
    name: "Tacloban",
    address: "Pan-Philippine Hwy",
    city: "Tacloban City",
    province: "Leyte",
    region: "Visayas",
    phone: null,
    phoneDisplay: null,
    mobile: "+639454362991",
    mobileDisplay: "0945-436-2991",
    isHeadOffice: false,
    services: ["sales", "parts", "service"],
    hours: standardHours,
    mapQuery: "JAC Motors Tacloban, Pan-Philippine Hwy Tacloban City",
    lat: 11.2244,
    lng: 124.9973,
  },
]

export const headOffice = branches.find((b) => b.isHeadOffice)!

/** Current open/closed state for a branch, evaluated in Asia/Manila time. */
export function branchStatus(branch: Branch, now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00"
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00"
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)
  const current = `${hour === "24" ? "00" : hour}:${minute}`
  const today = branch.hours[day]
  if (!today) return { open: false, label: "Closed today" } as const
  if (current < today.open) return { open: false, label: `Opens ${formatTime(today.open)}` } as const
  if (current >= today.close) return { open: false, label: "Closed" } as const
  return { open: true, label: `Open · closes ${formatTime(today.close)}` } as const
}

function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

export function mapsUrl(branch: Branch) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.mapQuery)}`
}
