import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { DEMO_MODE, demoAccount, type DemoAccount } from "@/lib/demo/accounts"

export const DEMO_COOKIE = "jac_demo"
const secret = () => process.env.DEMO_SECRET || "jac-motors-local-demo"
const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url")

/** Signed cookie value "<accountId>.<hmac>" so the demo session can't be forged into another persona by editing it. */
export function demoCookieValue(id: string) {
  return `${id}.${sign(id)}`
}

export async function getDemoAccount(): Promise<DemoAccount | null> {
  if (!DEMO_MODE) return null
  const raw = (await cookies()).get(DEMO_COOKIE)?.value
  if (!raw) return null
  const [id, mac] = raw.split(".")
  if (!id || !mac) return null
  const expected = Buffer.from(sign(id))
  const got = Buffer.from(mac)
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null
  return demoAccount(id)
}
