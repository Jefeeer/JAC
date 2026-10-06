export default function PartsLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="bg-asphalt">
        <div className="mx-auto max-w-[1440px] px-4 pt-16 pb-10 sm:px-6">
          <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-20 max-w-2xl animate-pulse rounded bg-white/10" />
          <div className="mt-8 h-16 max-w-5xl animate-pulse rounded-sm bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-sm border border-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
              <div className="size-[4.5rem] animate-pulse rounded-sm bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading parts…</span>
    </div>
  )
}
