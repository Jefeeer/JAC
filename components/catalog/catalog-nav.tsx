"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type NavCtx = { pending: boolean; navigate: (params: URLSearchParams) => void; basePath: string }
const CatalogNavContext = createContext<NavCtx | null>(null)

function useCatalogNav() {
  const ctx = useContext(CatalogNavContext)
  if (!ctx) throw new Error("Catalog components must be inside <CatalogNavProvider>")
  return ctx
}

/** Owns the URL for a catalog page; children share the pending state. */
export function CatalogNavProvider({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const navigate = useCallback(
    (params: URLSearchParams) => {
      for (const [k, v] of [...params.entries()]) if (!v) params.delete(k)
      params.delete("page")
      const qs = params.toString()
      startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }))
    },
    [router, basePath],
  )
  return <CatalogNavContext.Provider value={{ pending, navigate, basePath }}>{children}</CatalogNavContext.Provider>
}

/** Dims results while a filter navigation is in flight. */
export function CatalogResults({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useCatalogNav()
  return (
    <div aria-busy={pending} data-pending={pending || undefined} className={cn("transition-opacity duration-200 data-pending:opacity-45", className)}>
      {children}
    </div>
  )
}

export function PendingBar() {
  const { pending } = useCatalogNav()
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden", !pending && "hidden")} aria-hidden>
      <div className="h-full w-1/3 animate-[marquee_1s_linear_infinite] bg-brand [animation-direction:reverse]" />
    </div>
  )
}

/**
 * GET form that applies itself on change. Works as a plain form without JS.
 * `preserve` = other URL params this form doesn't own (kept as hidden inputs).
 */
export function AutoForm({
  children,
  preserve,
  className,
  onApplied,
}: {
  children: React.ReactNode
  preserve?: Record<string, string | undefined>
  className?: string
  onApplied?: () => void
}) {
  const { navigate, basePath } = useCatalogNav()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams()
    for (const [k, v] of new FormData(form).entries()) if (typeof v === "string" && v.trim()) params.append(k, v.trim())
    navigate(params)
    onApplied?.()
  }

  return (
    <form
      action={basePath}
      method="get"
      className={className}
      onChange={(e) => {
        const form = e.currentTarget
        const target = e.target as unknown as HTMLInputElement
        clearTimeout(timer.current)
        // Free-text and number fields wait for a pause in typing.
        const delay = target.type === "text" || target.type === "search" || target.type === "number" ? 450 : 0
        timer.current = setTimeout(() => apply(form), delay)
      }}
      onSubmit={(e) => {
        e.preventDefault()
        clearTimeout(timer.current)
        apply(e.currentTarget)
      }}
    >
      {Object.entries(preserve ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {children}
    </form>
  )
}

/** Big search box; keeps focus while results update. */
export function CatalogSearch({
  value,
  preserve,
  placeholder,
  label,
}: {
  value?: string
  preserve?: Record<string, string | undefined>
  placeholder: string
  label: string
}) {
  const [text, setText] = useState(value ?? "")
  const ref = useRef<HTMLInputElement>(null)

  // Sync from the URL (e.g. "clear all") unless the user is typing.
  useEffect(() => {
    // external URL state → local input (skipped while the user is typing)
    if (document.activeElement !== ref.current) setText(value ?? "")
  }, [value])

  return (
    <AutoForm preserve={preserve} className="relative">
      <label className="sr-only" htmlFor="catalog-q">
        {label}
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={ref}
        id="catalog-q"
        name="q"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={60}
        className="h-16 w-full rounded-sm border border-input bg-surface pr-14 pl-14 font-mono text-base outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/70 hover:border-foreground/30 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText("")
            // let React flush the empty value, then submit
            requestAnimationFrame(() => ref.current?.form?.requestSubmit())
          }}
          className="absolute top-1/2 right-4 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </AutoForm>
  )
}
