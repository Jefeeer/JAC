export default function TrucksLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading trucks">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1440px] px-4 pt-16 pb-8 sm:px-6">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-20 w-3/4 max-w-xl animate-pulse rounded bg-muted" />
          <div className="mt-8 h-16 max-w-3xl animate-pulse rounded-sm bg-muted" />
        </div>
      </div>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-sm border border-border">
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-12 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading trucks…</span>
    </div>
  )
}
