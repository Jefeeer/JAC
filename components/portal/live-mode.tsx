"use client"

import { createContext, useContext } from "react"

/** true → live updates by polling (DEMO MODE data isn't in Postgres, so Realtime can't see it). */
const PollingContext = createContext(false)

export function LiveModeProvider({ polling, children }: { polling: boolean; children: React.ReactNode }) {
  return <PollingContext.Provider value={polling}>{children}</PollingContext.Provider>
}

export const usePollingMode = () => useContext(PollingContext)
