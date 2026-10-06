import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"

/**
 * Shared bits for next/og images. Satori can't read WOFF2 or WebP, so the
 * fonts ship as WOFF in /assets/og and photos are transcoded to JPEG.
 */

export const OG_SIZE = { width: 1200, height: 630 }

export const OG = {
  asphalt: "#141518",
  red: "#d7000f",
  paper: "#f2f0eb",
  muted: "#a3a19b",
  signal: "#f5b301",
}

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 700 | 900; style: "normal" }[]> | null = null

export function ogFonts() {
  const dir = join(process.cwd(), "assets/og")
  fonts ??= Promise.all([
    readFile(join(dir, "big-shoulders-display-latin-900-normal.woff")).then((data) => ({ name: "Shoulders", data, weight: 900 as const, style: "normal" as const })),
    readFile(join(dir, "archivo-latin-500-normal.woff")).then((data) => ({ name: "Archivo", data, weight: 500 as const, style: "normal" as const })),
    readFile(join(dir, "archivo-latin-700-normal.woff")).then((data) => ({ name: "Archivo", data, weight: 700 as const, style: "normal" as const })),
    readFile(join(dir, "jetbrains-mono-latin-600-normal.woff")).then((data) => ({ name: "Mono", data, weight: 600 as const, style: "normal" as const })),
  ])
  return fonts
}

/** Load a photo as a JPEG data URI: local /public paths or remote (Supabase Storage) URLs. */
export async function ogPhoto(src: string | null | undefined, width = 760, height = 630): Promise<string | null> {
  if (!src) return null
  try {
    let input: Buffer
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return null
      input = Buffer.from(await res.arrayBuffer())
    } else {
      const clean = src.split("?")[0].replace(/^\/+/, "")
      if (clean.includes("..")) return null
      input = await readFile(join(process.cwd(), "public", clean))
    }
    const jpg = await sharp(input).resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 78 }).toBuffer()
    return `data:image/jpeg;base64,${jpg.toString("base64")}`
  } catch {
    return null
  }
}

/** The display fonts have no ₱ glyph, so OG images spell out PHP. */
export const ogPrice = (n: number) => `PHP ${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`

/** The JAC wordmark, drawn with the same path as components/brand. */
export function OgWordmark({ height = 44 }: { height?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
      <span style={{ fontFamily: "Shoulders", fontSize: height * 1.25, lineHeight: 0.8, color: OG.red, letterSpacing: -1 }}>JAC</span>
      <span style={{ fontFamily: "Mono", fontSize: height * 0.3, color: "#fff", letterSpacing: 4, paddingBottom: 2 }}>MOTORS</span>
    </div>
  )
}

/** Hazard stripe used across the site. */
export function OgStripe({ height = 14 }: { height?: number }) {
  return (
    <div
      style={{
        display: "flex",
        height,
        width: "100%",
        backgroundImage: `repeating-linear-gradient(-45deg, ${OG.signal} 0 18px, ${OG.asphalt} 18px 36px)`,
      }}
    />
  )
}
