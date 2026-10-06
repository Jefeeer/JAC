export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string
  updated: string
  sections: { heading: string; body: (string | string[])[] }[]
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">Last updated {updated}</p>
      <h1 className="mt-3 text-6xl leading-[0.9] font-black uppercase">{title}</h1>
      <p className="mt-6 rounded-sm border border-signal/60 bg-signal/10 p-4 text-sm">
        Template wording — to be reviewed by JAC Motors&apos; legal counsel / Data Protection Officer before launch.
      </p>
      <div className="mt-10 grid gap-10">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="font-display text-3xl font-extrabold uppercase">
              <span className="mr-3 font-mono text-sm text-brand-ink">{String(i + 1).padStart(2, "0")}</span>
              {s.heading}
            </h2>
            <div className="mt-3 grid gap-3 leading-relaxed text-muted-foreground">
              {s.body.map((b, j) =>
                Array.isArray(b) ? (
                  <ul key={j} className="list-disc space-y-1 pl-5">
                    {b.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={j}>{b}</p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
