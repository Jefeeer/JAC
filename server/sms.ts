import "server-only"

/**
 * Optional SMS via Twilio's REST API (no SDK needed). Silently skipped when
 * TWILIO_* env vars are absent. Never throws.
 */

/** 0917 123 4567 / 63917… / +63 917… → +639171234567. Returns null for non-mobile numbers. */
export function toPhMobileE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`
  if (/^639\d{9}$/.test(digits)) return `+${digits}`
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`
  return null
}

export async function sendSms(to: string | null | undefined, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  const number = toPhMobileE164(to)
  if (!sid || !token || !from || !number) return false

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: number, From: from, Body: body.slice(0, 600) }),
    })
    if (!res.ok) console.error("[sms] Twilio error", res.status, await res.text())
    return res.ok
  } catch (e) {
    console.error("[sms] send threw", e)
    return false
  }
}
