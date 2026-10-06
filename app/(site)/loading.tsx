export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1440px] flex-col justify-center px-4 sm:px-6" role="status" aria-live="polite">
      <div className="relative h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 w-1/3 animate-[marquee_1.2s_linear_infinite] bg-[repeating-linear-gradient(90deg,var(--brand)_0_18px,transparent_18px_30px)] [animation-direction:reverse]" />
      </div>
      <p className="mt-4 font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">Loading the bay…</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-sm bg-muted" />
        ))}
      </div>
    </div>
  )
}
