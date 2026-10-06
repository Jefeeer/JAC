"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheckIcon, LoaderIcon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { useConfirm } from "@/components/shared/confirm"
import { markAdminNotificationsReadAction } from "@/server/actions/admin"

export function MarkAllAdminRead({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const confirm = useConfirm()
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={async () => {
        if (!(await confirm({ title: "Mark all as read?", description: "Clears the unread badge for you and your role's shared alerts.", confirmLabel: "Mark all read", icon: "check" }))) return
        start(async () => {
          await markAdminNotificationsReadAction()
          router.refresh()
        })
      }}
      className={btn.outline}
    >
      {pending ? <LoaderIcon className="size-4 animate-spin" /> : <CheckCheckIcon className="size-4" />} Mark all read
    </button>
  )
}
