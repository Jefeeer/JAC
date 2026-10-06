import type { Metadata } from "next"
import Image from "next/image"
import credits from "@/lib/photo-credits.json"

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Attribution for photography used on the JAC Motors website.",
  alternates: { canonical: "/credits" },
}

export default function CreditsPage() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">Attribution</p>
      <h1 className="mt-3 text-6xl leading-[0.9] font-black uppercase sm:text-7xl">Photo credits</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Interim photography is sourced from Wikimedia Commons under the licenses listed below. Images have been resized and re-encoded; where an original is licensed
        CC BY-SA, the adapted version is shared under the same license.
      </p>
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((c) => (
          <li key={c.src} className="overflow-hidden rounded-sm border border-border bg-card">
            <div className="relative aspect-[4/3] bg-muted">
              <Image src={c.src} alt={c.title} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" />
            </div>
            <div className="p-4 text-sm">
              <p className="font-medium">{c.title}</p>
              <p className="mt-1 text-muted-foreground">
                {c.author} · {c.license}
              </p>
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-xs text-brand-ink underline-offset-4 hover:underline">
                Source on Wikimedia Commons ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
