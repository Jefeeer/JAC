"use client"

import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ConfirmProvider } from "@/components/shared/confirm"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster position="top-center" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
