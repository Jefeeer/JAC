import "server-only"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { JAC_WORDMARK_PATHS } from "@/components/brand/logo"
import { branches } from "@/lib/config/branches"
import { siteConfig } from "@/lib/config/site"

/**
 * JAC-branded quote / invoice PDFs (Node fallback; the Python service
 * renders the same layout with ReportLab in production).
 * Standard PDF fonts can't encode "₱", so amounts use the "PHP" prefix.
 */

export type DocLine = { description: string; quantity: number; unitPrice: number }
export type DocData = {
  kind: "QUOTATION" | "INVOICE"
  reference: string
  date: string
  validUntil?: string | null
  dueDate?: string | null
  status?: string
  billTo: { name: string; company?: string | null; tin?: string | null; address?: string | null; email?: string | null; phone?: string | null }
  subject?: string | null
  intro?: string | null
  lines: DocLine[]
  discount: number
  vatRate: number
  terms?: string | null
  branchSlug?: string | null
  preparedBy?: string | null
}

const C = {
  asphalt: rgb(0.078, 0.082, 0.094),
  red: rgb(0.843, 0, 0.059),
  ink: rgb(0.086, 0.09, 0.102),
  muted: rgb(0.37, 0.36, 0.34),
  line: rgb(0.88, 0.87, 0.84),
  paper: rgb(0.98, 0.976, 0.965),
  concrete: rgb(0.957, 0.949, 0.933),
}

const money = (n: number) => `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (s: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00+08:00` : s))

/** Strip characters outside WinAnsi so standard fonts never throw. */
const safe = (s: string | null | undefined) =>
  (s ?? "")
    .replace(/₱/g, "PHP ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[×]/g, "x")
    .replace(/[·•]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of safe(text).split("\n")) {
    let line = ""
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line)
        line = word
      } else line = test
    }
    out.push(line)
  }
  return out
}

export async function renderDocumentPdf(d: DocData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${d.kind === "QUOTATION" ? "Quotation" : "Invoice"} ${d.reference} — ${siteConfig.legalName}`)
  pdf.setAuthor(siteConfig.legalName)
  pdf.setCreator("JAC Motors website")
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdf.embedFont(StandardFonts.Courier)
  const monoBold = await pdf.embedFont(StandardFonts.CourierBold)

  const W = 595.28 // A4
  const H = 841.89
  const M = 42
  let page: PDFPage = pdf.addPage([W, H])
  let y = H

  const branch = branches.find((b) => b.slug === d.branchSlug) ?? branches.find((b) => b.isHeadOffice)!

  const header = (p: PDFPage) => {
    p.drawRectangle({ x: 0, y: H - 86, width: W, height: 86, color: C.asphalt })
    p.drawRectangle({ x: 0, y: H - 92, width: W, height: 6, color: C.red })
    // wordmark (viewBox 330x80) scaled to 110x26.7
    const s = 110 / 330
    for (const path of JAC_WORDMARK_PATHS) p.drawSvgPath(path, { x: M, y: H - 28, scale: s, color: C.red })
    p.drawText("MOTORS", { x: M + 1, y: H - 70, size: 8, font: bold, color: rgb(0.96, 0.95, 0.93) })
    p.drawText(d.kind, { x: W - M - bold.widthOfTextAtSize(d.kind, 20), y: H - 50, size: 20, font: bold, color: rgb(1, 1, 1) })
    p.drawText(d.reference, { x: W - M - monoBold.widthOfTextAtSize(d.reference, 11), y: H - 68, size: 11, font: monoBold, color: rgb(0.85, 0.84, 0.8) })
  }
  const footer = (p: PDFPage, n: number) => {
    p.drawLine({ start: { x: M, y: 54 }, end: { x: W - M, y: 54 }, thickness: 0.5, color: C.line })
    const left = `${siteConfig.legalName}  -  ${branch.address}, ${branch.city}  -  ${branch.phoneDisplay ?? branch.mobileDisplay ?? siteConfig.contact.phoneDisplay}`
    p.drawText(safe(left), { x: M, y: 40, size: 7.5, font: regular, color: C.muted })
    p.drawText("Built to keep you moving.", { x: M, y: 28, size: 7.5, font: bold, color: C.red })
    const pg = `Page ${n}`
    p.drawText(pg, { x: W - M - regular.widthOfTextAtSize(pg, 7.5), y: 40, size: 7.5, font: regular, color: C.muted })
  }

  header(page)
  y = H - 122

  // Meta + bill-to
  const label = (t: string, x: number, yy: number) => page.drawText(t.toUpperCase(), { x, y: yy, size: 7, font: bold, color: C.red })
  label("Bill to", M, y)
  label(d.kind === "QUOTATION" ? "Quotation details" : "Invoice details", 340, y)
  let ly = y - 16
  const billLines = [d.billTo.company, d.billTo.name, d.billTo.tin ? `TIN ${d.billTo.tin}` : null, d.billTo.address, d.billTo.email, d.billTo.phone].filter(Boolean) as string[]
  billLines.forEach((t, i) => {
    page.drawText(safe(t), { x: M, y: ly, size: i === 0 ? 11 : 9, font: i === 0 ? bold : regular, color: C.ink })
    ly -= i === 0 ? 15 : 12.5
  })
  let ry = y - 16
  const meta: [string, string][] = [
    ["Date", fmtDate(d.date)],
    ...(d.validUntil ? ([["Valid until", fmtDate(d.validUntil)]] as [string, string][]) : []),
    ...(d.dueDate ? ([["Due", fmtDate(d.dueDate)]] as [string, string][]) : []),
    ["Branch", `JAC Motors ${branch.name}`],
    ...(d.preparedBy ? ([["Prepared by", d.preparedBy]] as [string, string][]) : []),
    ...(d.status ? ([["Status", d.status.toUpperCase()]] as [string, string][]) : []),
  ]
  for (const [k, v] of meta) {
    page.drawText(k, { x: 340, y: ry, size: 9, font: regular, color: C.muted })
    page.drawText(safe(v), { x: 420, y: ry, size: 9, font: bold, color: C.ink })
    ry -= 13.5
  }
  y = Math.min(ly, ry) - 14

  if (d.subject) {
    page.drawText(safe(d.subject), { x: M, y, size: 13, font: bold, color: C.ink })
    y -= 30
  }
  if (d.intro) {
    for (const l of wrap(d.intro, regular, 9.5, W - 2 * M)) {
      page.drawText(l, { x: M, y, size: 9.5, font: regular, color: C.ink })
      y -= 13
    }
    y -= 14
  }

  // Table
  // right edges for numeric columns
  const cols = { desc: M + 10, qty: 352, unitRight: 452, total: W - M - 10 }
  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: C.asphalt })
    page.drawText("DESCRIPTION", { x: cols.desc, y: y + 1, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("QTY", { x: cols.qty, y: y + 1, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("UNIT PRICE", { x: cols.unitRight - bold.widthOfTextAtSize("UNIT PRICE", 7.5), y: y + 1, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    const t = "AMOUNT"
    page.drawText(t, { x: cols.total - bold.widthOfTextAtSize(t, 7.5), y: y + 1, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    y -= 26
  }
  tableHeader()
  let pageNo = 1
  d.lines.forEach((line, i) => {
    const desc = wrap(line.description, regular, 9, cols.qty - cols.desc - 16)
    const rowH = Math.max(18, desc.length * 11.5 + 7)
    if (y - rowH < 160) {
      footer(page, pageNo++)
      page = pdf.addPage([W, H])
      header(page)
      y = H - 120
      tableHeader()
    }
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - rowH + 12, width: W - 2 * M, height: rowH, color: C.paper })
    desc.forEach((l, k) => page.drawText(l, { x: cols.desc, y: y - k * 11.5, size: 9, font: regular, color: C.ink }))
    page.drawText(String(line.quantity), { x: cols.qty, y, size: 9, font: mono, color: C.ink })
    const unit = money(line.unitPrice).replace("PHP ", "")
    page.drawText(unit, { x: cols.unitRight - mono.widthOfTextAtSize(unit, 9), y, size: 9, font: mono, color: C.ink })
    const amt = money(line.quantity * line.unitPrice).replace("PHP ", "")
    page.drawText(amt, { x: cols.total - mono.widthOfTextAtSize(amt, 9), y, size: 9, font: mono, color: C.ink })
    y -= rowH
  })

  // Totals
  const subtotal = d.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const net = Math.max(subtotal - d.discount, 0)
  const vat = Math.round(net * d.vatRate * 100) / 100
  const total = net + vat
  y -= 6
  page.drawLine({ start: { x: 330, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.6, color: C.line })
  const totalsRows: [string, string, boolean][] = [
    ["Subtotal", money(subtotal), false],
    ...(d.discount ? ([["Discount", `- ${money(d.discount)}`, false]] as [string, string, boolean][]) : []),
    [`VAT (${Math.round(d.vatRate * 100)}%)`, money(vat), false],
  ]
  for (const [k, v] of totalsRows) {
    page.drawText(k, { x: 340, y: y - 4, size: 9, font: regular, color: C.muted })
    page.drawText(v, { x: W - M - 10 - mono.widthOfTextAtSize(v, 9), y: y - 4, size: 9, font: mono, color: C.ink })
    y -= 15
  }
  y -= 10
  page.drawRectangle({ x: 330, y: y - 14, width: W - M - 330, height: 26, color: C.red })
  page.drawText("TOTAL", { x: 340, y: y - 5, size: 10, font: bold, color: rgb(1, 1, 1) })
  const tv = money(total)
  page.drawText(tv, { x: W - M - 10 - monoBold.widthOfTextAtSize(tv, 11), y: y - 5, size: 11, font: monoBold, color: rgb(1, 1, 1) })
  y -= 44

  if (d.terms) {
    page.drawText("TERMS & NOTES", { x: M, y, size: 7, font: bold, color: C.red })
    y -= 14
    for (const l of wrap(d.terms, regular, 8.5, W - 2 * M)) {
      if (y < 80) break
      page.drawText(l, { x: M, y, size: 8.5, font: regular, color: C.muted })
      y -= 11.5
    }
  }
  if (d.kind === "QUOTATION") {
    const note = "This quotation is not an official receipt. Prices and availability are subject to confirmation upon order."
    page.drawText(note, { x: M, y: 70, size: 7.5, font: regular, color: C.muted })
  }
  footer(page, pageNo)
  return pdf.save()
}
