import "server-only"

import { branches } from "@/lib/config/branches"
import { siteConfig } from "@/lib/config/site"

/**
 * JAC Motors email layout — table-based, inline-styled HTML that renders in
 * Gmail, Outlook and Apple Mail. Every dynamic string passes through esc().
 */

const C = {
  asphalt: "#141518",
  concrete: "#EEECE7",
  paper: "#FFFFFF",
  red: "#D7000F",
  ink: "#16171A",
  muted: "#5E5C57",
  line: "#E1DED6",
  amber: "#F2B705",
  green: "#1F8A4C",
}
const FONT = "Arial, Helvetica, sans-serif"
const DISPLAY = "'Arial Black', 'Arial Bold', Impact, Arial, sans-serif"
const MONO = "'Courier New', Courier, monospace"

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Absolute URL for links and images in emails. */
export function absUrl(path: string) {
  return path.startsWith("http") ? path : `${siteConfig.url.replace(/\/$/, "")}${path}`
}

export type EmailBlock =
  | { type: "paragraph"; text: string }
  | { type: "reference"; label: string; value: string }
  | { type: "details"; rows: [label: string, value: string | null | undefined][] }
  | { type: "button"; label: string; href: string }
  | { type: "timeline"; steps: string[]; current: number }
  | { type: "callout"; tone: "info" | "warning" | "success"; title: string; text: string }
  | { type: "quote"; text: string }
  | { type: "divider" }

export type EmailContent = {
  /** Inbox preview line */
  preheader: string
  eyebrow: string
  heading: string
  blocks: EmailBlock[]
  /** Short line at the bottom explaining why they got it */
  reason: string
}

function block(b: EmailBlock): string {
  switch (b.type) {
    case "paragraph":
      return `<p style="margin:0 0 18px;font:16px/1.6 ${FONT};color:${C.ink};">${esc(b.text).replace(/\n/g, "<br>")}</p>`
    case "quote":
      return `<div style="margin:0 0 20px;padding:14px 18px;border-left:3px solid ${C.red};background:${C.concrete};font:15px/1.6 ${FONT};color:${C.ink};">${esc(b.text).replace(/\n/g, "<br>")}</div>`
    case "reference":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;border:2px dashed ${C.line};"><tr><td style="padding:12px 20px;">
        <div style="font:11px/1 ${MONO};letter-spacing:3px;text-transform:uppercase;color:${C.muted};">${esc(b.label)}</div>
        <div style="margin-top:8px;font:bold 24px/1 ${MONO};letter-spacing:2px;color:${C.ink};">${esc(b.value)}</div>
      </td></tr></table>`
    case "details": {
      const rows = b.rows.filter((r): r is [string, string] => r[1] !== null && r[1] !== undefined && r[1] !== "")
      if (!rows.length) return ""
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid ${C.line};">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.line};font:12px/1.4 ${MONO};letter-spacing:1px;text-transform:uppercase;color:${C.muted};white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.line};font:15px/1.5 ${FONT};color:${C.ink};text-align:right;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
        )
        .join("")}</table>`
    }
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 26px;"><tr><td bgcolor="${C.red}" style="border-radius:3px;">
        <a href="${esc(b.href)}" style="display:inline-block;padding:15px 26px;font:bold 13px/1 ${FONT};letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${esc(b.label)} &rarr;</a>
      </td></tr></table>`
    case "timeline": {
      const cells = b.steps
        .map((s, i) => {
          const done = i < b.current
          const now = i === b.current
          const bg = done || now ? C.red : C.line
          const color = done || now ? C.ink : C.muted
          return `<td width="${Math.floor(100 / b.steps.length)}%" style="padding:0 2px;vertical-align:top;">
            <div style="height:6px;background:${bg};${now ? "" : done ? "" : ""}font-size:0;line-height:0;">&nbsp;</div>
            <div style="padding-top:8px;font:${now ? "bold " : ""}11px/1.3 ${FONT};color:${color};">${esc(s)}</div>
          </td>`
        })
        .join("")
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>${cells}</tr></table>`
    }
    case "callout": {
      const tone = { info: C.asphalt, warning: C.amber, success: C.green }[b.tone]
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="padding:16px 18px;border:1px solid ${C.line};border-left:4px solid ${tone};background:#FAF9F6;">
        <div style="font:bold 14px/1.4 ${FONT};color:${C.ink};">${esc(b.title)}</div>
        <div style="margin-top:4px;font:14px/1.55 ${FONT};color:${C.muted};">${esc(b.text)}</div>
      </td></tr></table>`
    }
    case "divider":
      return `<div style="height:1px;background:${C.line};margin:8px 0 24px;font-size:0;line-height:0;">&nbsp;</div>`
  }
}

export function renderEmailHtml(content: EmailContent): string {
  const hq = branches.find((b) => b.isHeadOffice) ?? branches[0]
  const { contact } = siteConfig
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.concrete};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(content.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.concrete}">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td bgcolor="${C.asphalt}" style="padding:22px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><a href="${esc(absUrl("/"))}"><img src="${esc(absUrl("/brand/jac-motors-logo-reversed.png"))}" width="132" alt="JAC Motors" style="display:block;border:0;width:132px;height:auto;"></a></td>
        <td align="right" style="font:11px/1.4 ${MONO};letter-spacing:2px;text-transform:uppercase;color:#A9A79F;">Sales · Parts · Service</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${C.red}" style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td bgcolor="${C.paper}" style="padding:36px 32px 12px;">
      <div style="font:bold 11px/1 ${MONO};letter-spacing:3px;text-transform:uppercase;color:${C.red};">${esc(content.eyebrow)}</div>
      <h1 style="margin:12px 0 20px;font:900 30px/1.05 ${DISPLAY};text-transform:uppercase;letter-spacing:-0.5px;color:${C.ink};">${esc(content.heading)}</h1>
      ${content.blocks.map(block).join("\n")}
    </td></tr>
    <tr><td bgcolor="${C.paper}" style="padding:0 32px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};"><tr>
        <td style="padding-top:18px;font:13px/1.6 ${FONT};color:${C.muted};">
          <strong style="color:${C.ink};">Breakdown? Call JAC now:</strong>
          <a href="tel:${esc(contact.breakdownPhone)}" style="color:${C.red};text-decoration:none;font-weight:bold;">${esc(contact.breakdownPhoneDisplay)}</a>
          · <a href="https://m.me/${esc(contact.messengerHandle)}" style="color:${C.ink};">Messenger</a>
          · <a href="viber://chat?number=${esc(encodeURIComponent(contact.viber))}" style="color:${C.ink};">Viber</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${C.asphalt}" style="padding:26px 32px;">
      <div style="font:900 20px/1.1 ${DISPLAY};text-transform:uppercase;color:#F4F2EE;">Built to keep you <span style="color:#E8101E;">moving.</span></div>
      <div style="margin-top:12px;font:12px/1.6 ${FONT};color:#A9A79F;">
        ${esc(siteConfig.legalName)} · ${esc(hq.address)}, ${esc(hq.city)} · ${esc(contact.phoneDisplay)}<br>
        7 branches: ${esc(branches.map((b) => b.name).join(" · "))}
      </div>
      <div style="margin-top:14px;font:11px/1.5 ${FONT};color:#77756F;">${esc(content.reason)}</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

export function renderEmailText(content: EmailContent): string {
  const lines: string[] = [`JAC MOTORS — ${content.eyebrow.toUpperCase()}`, "", content.heading, ""]
  for (const b of content.blocks) {
    switch (b.type) {
      case "paragraph":
      case "quote":
        lines.push(b.text, "")
        break
      case "reference":
        lines.push(`${b.label}: ${b.value}`, "")
        break
      case "details":
        for (const [k, v] of b.rows) if (v) lines.push(`${k}: ${v}`)
        lines.push("")
        break
      case "button":
        lines.push(`${b.label}: ${b.href}`, "")
        break
      case "timeline":
        lines.push(b.steps.map((s, i) => (i === b.current ? `[${s}]` : s)).join(" → "), "")
        break
      case "callout":
        lines.push(`${b.title} — ${b.text}`, "")
        break
      case "divider":
        lines.push("—", "")
    }
  }
  const { contact } = siteConfig
  lines.push(
    `Breakdown? Call JAC now: ${contact.breakdownPhoneDisplay} · Messenger: m.me/${contact.messengerHandle}`,
    "",
    `${siteConfig.legalName} — Built to Keep You Moving`,
    content.reason,
  )
  return lines.join("\n")
}
