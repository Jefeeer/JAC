import "server-only"

/**
 * Client for the FastAPI service in /python-service. Authenticated with a
 * shared secret header; never called from the browser.
 */
export const pythonConfigured = () => Boolean(process.env.PYTHON_SERVICE_URL && process.env.PYTHON_SERVICE_SECRET)

export async function callPython<T>(path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const base = process.env.PYTHON_SERVICE_URL?.replace(/\/$/, "")
  const secret = process.env.PYTHON_SERVICE_SECRET
  if (!base || !secret) throw new Error("Python service is not configured")
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), "X-Service-Secret": secret },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Python service ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}
