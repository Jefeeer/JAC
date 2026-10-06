"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCcwIcon } from "lucide-react"
import { contactLinks, siteConfig } from "@/lib/config/site"

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col justify-center px-4 py-20 sm:px-6">
      <div className="hazard mb-8 h-2 w-40" aria-hidden />
      <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
        Check-engine light{error.digest ? ` · ref ${error.digest}` : ""}
      </p>
      <h1 className="mt-4 max-w-3xl text-6xl leading-[0.88] font-black uppercase sm:text-8xl">Something stalled.</h1>
      <p className="mt-6 max-w-lg text-muted-foreground">
        This page hit a snag on our side. Try again — and if you&apos;re stranded right now, don&apos;t wait on a web page: call us.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center gap-2 rounded-sm bg-foreground px-5 font-wide text-xs font-bold tracking-[0.14em] text-background uppercase"
        >
          <RotateCcwIcon className="size-4" /> Try again
        </button>
        <a
          href={contactLinks.tel(siteConfig.contact.breakdownPhone)}
          className="inline-flex h-12 items-center rounded-sm border border-border px-5 font-mono text-sm"
        >
          {siteConfig.contact.breakdownPhoneDisplay}
        </a>
        <Link href="/" className="inline-flex h-12 items-center px-2 text-sm underline underline-offset-4">
          Back to home
        </Link>
      </div>
    </section>
  )
}
