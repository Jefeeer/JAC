import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  actions,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  back?: { href: string; label: string }
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase hover:text-foreground">
            <ArrowLeftIcon className="size-3.5" /> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl leading-[0.95] font-black uppercase sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ElementType; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-sm border border-dashed border-border px-6 py-14 text-center">
      <Icon className="size-9 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 text-2xl font-extrabold uppercase">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export const primaryBtn =
  "inline-flex h-11 items-center gap-2 rounded-sm bg-foreground px-4 font-wide text-[11px] font-bold tracking-[0.14em] text-background uppercase transition-colors hover:bg-brand hover:text-white"
export const secondaryBtn = "inline-flex h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium hover:border-foreground/40"
