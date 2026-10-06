import type { BookingStatus, JobStatus, QuoteStatus } from "@/types/domain"

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "brand"

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone; customer: string }> = {
  new: { label: "New", tone: "brand", customer: "Received" },
  in_review: { label: "In review", tone: "info", customer: "Being prepared" },
  quoted: { label: "Quoted", tone: "warning", customer: "Quote ready" },
  accepted: { label: "Accepted", tone: "success", customer: "Accepted" },
  rejected: { label: "Rejected", tone: "neutral", customer: "Declined" },
  expired: { label: "Expired", tone: "neutral", customer: "Expired" },
  closed: { label: "Closed", tone: "neutral", customer: "Closed" },
}

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting confirmation", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  rescheduled: { label: "Rescheduled", tone: "info" },
  converted: { label: "Checked in", tone: "brand" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  no_show: { label: "No-show", tone: "danger" },
}

export const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  received: { label: "Received", tone: "info" },
  diagnosing: { label: "Diagnosing", tone: "warning" },
  awaiting_parts: { label: "Awaiting parts", tone: "warning" },
  in_progress: { label: "In progress", tone: "brand" },
  ready: { label: "Ready for release", tone: "success" },
  released: { label: "Released", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
}

export const MAINTENANCE_STATE = {
  ok: { label: "Up to date", tone: "success" as Tone },
  due_soon: { label: "Due soon", tone: "warning" as Tone },
  overdue: { label: "Overdue", tone: "danger" as Tone },
}

export const toneClass: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  info: "border-foreground/30 text-foreground",
  warning: "border-signal/70 text-signal-foreground dark:text-signal",
  success: "border-success/50 text-success",
  danger: "border-destructive/50 text-destructive",
  brand: "border-brand/60 text-brand-ink",
}
