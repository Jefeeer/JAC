"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheckIcon, LoaderIcon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { markAdminNotificationsReadAction } from "@/server/actions/admin"

export function MarkAllAdminRead({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await markAdminNotificationsReadAction()
          router.refresh()
        })
      }
      className={btn.outline}
    >
      {pending ? <LoaderIcon className="size-4 animate-spin" /> : <CheckCheckIcon className="size-4" />} Mark all read
    </button>
  )
}
