"use client"

import type { ComponentProps, MouseEvent } from "react"
import Link from "next/link"

/**
 * `<Link>` that still does something when it points at the page you're on.
 * The App Router treats a click on the current URL (or a same-page `#hash`)
 * as a no-op and never fires `hashchange`, so:
 *   - same path, no hash  → scroll back to the top
 *   - same path, `#hash`  → update the hash, scroll to it and fire `hashchange`
 *                           so listeners (e.g. the branch directory) react
 */
export function NavLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    const target = new URL(href, window.location.href)
    if (target.pathname !== window.location.pathname || target.search !== window.location.search) return

    e.preventDefault()
    if (!target.hash) {
      if (window.location.hash) history.replaceState(history.state, "", target.pathname + target.search)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // pushState is patched by the App Router, so it keeps its own history state
    if (window.location.hash !== target.hash) history.pushState(null, "", target.hash)
    document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  }

  return <Link href={href} onClick={handleClick} {...props} />
}
