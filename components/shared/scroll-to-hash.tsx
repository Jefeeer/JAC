"use client"

import { useEffect } from "react"

/**
 * Scrolls to `location.hash` once the page content has mounted. Needed on
 * routes with a `loading.tsx`: on client navigation the router looks for the
 * `#id` while the skeleton is showing, doesn't find it, and never retries.
 */
export function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" })
  }, [])
  return null
}
