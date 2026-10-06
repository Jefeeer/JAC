"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { FinancingEstimate, TradeInDetails } from "@/lib/validation/quote"

type PurchaseState = {
  estimate: FinancingEstimate | null
  setEstimate: (e: FinancingEstimate | null) => void
  tradeIn: TradeInDetails | null
  setTradeIn: (t: TradeInDetails | null) => void
  /** User explicitly asked to attach the estimate to their quote */
  attach: boolean
  setAttach: (v: boolean) => void
}

const PurchaseContext = createContext<PurchaseState | null>(null)

/** Shares the financing calculator's numbers with the quote form on the truck page. */
export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [estimate, setEstimate] = useState<FinancingEstimate | null>(null)
  const [tradeIn, setTradeIn] = useState<TradeInDetails | null>(null)
  const [attach, setAttach] = useState(false)
  const value = useMemo(() => ({ estimate, setEstimate, tradeIn, setTradeIn, attach, setAttach }), [estimate, tradeIn, attach])
  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>
}

export function usePurchase() {
  const ctx = useContext(PurchaseContext)
  if (!ctx) throw new Error("usePurchase must be used inside <PurchaseProvider>")
  return ctx
}
