/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). Returns rows keyed by lower-cased header. */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const records: string[][] = []
  let field = ""
  let row: string[] = []
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(field)
      if (row.some((c) => c.trim() !== "")) records.push(row)
      row = []
      field = ""
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c.trim() !== "")) records.push(row)

  const headers = (records.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))
  return {
    headers,
    rows: records.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))),
  }
}
