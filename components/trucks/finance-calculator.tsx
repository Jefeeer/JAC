"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, RepeatIcon } from "lucide-react"
import { Field, TextInput } from "@/components/forms/controls"
import { usePurchase } from "@/components/trucks/purchase-context"
import { formatPeso } from "@/lib/format"
import { cn } from "@/lib/utils"

const TERMS = [12, 24, 36, 48, 60] as const

export function monthlyPayment(principal: number, ratePct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0
  const r = ratePct / 100 / 12
  if (r === 0) return principal / months
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

const parsePeso = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/**
 * Financing + trade-in estimator. Pure client-side maths (standard
 * amortisation); results can be attached to the quote request.
 * `standalone` (inventory page) has no quote form below it, so the CTA
 * sends the visitor back up to pick a unit instead.
 */
export function FinanceCalculator({
  price,
  priceOnRequest,
  standalone = false,
}: {
  price: number | null
  priceOnRequest: boolean
  standalone?: boolean
}) {
  const { setEstimate, setTradeIn, setAttach, attach } = usePurchase()
  const [unitPrice, setUnitPrice] = useState<number>(priceOnRequest || price === null ? 0 : price)
  const [downPct, setDownPct] = useState(20)
  const [term, setTerm] = useState<number>(36)
  const [rate, setRate] = useState(12)
  const [hasTradeIn, setHasTradeIn] = useState(false)
  const [trade, setTrade] = useState({ make: "", model: "", year: "", mileageKm: "", value: "" })
  const ids = { down: useId(), rate: useId() }

  const tradeValue = hasTradeIn ? parsePeso(trade.value) : 0
  const calc = useMemo(() => {
    const down = Math.round((unitPrice * downPct) / 100)
    const financed = Math.max(unitPrice - down - tradeValue, 0)
    const monthly = monthlyPayment(financed, rate, term)
    const totalPayable = monthly * term
    return { down, financed, monthly, totalInterest: Math.max(totalPayable - financed, 0), totalPayable }
  }, [unitPrice, downPct, tradeValue, rate, term])

  // Publish to the quote form
  useEffect(() => {
    setEstimate(
      unitPrice > 0
        ? {
            price: unitPrice,
            downPaymentPct: downPct,
            termMonths: term,
            ratePct: rate,
            tradeInValue: tradeValue,
            amountFinanced: Math.round(calc.financed),
            monthly: Math.round(calc.monthly),
          }
        : null,
    )
  }, [unitPrice, downPct, term, rate, tradeValue, calc, setEstimate])

  useEffect(() => {
    setTradeIn(
      hasTradeIn && (trade.make || trade.model)
        ? {
            make: trade.make,
            model: trade.model,
            year: trade.year ? Number(trade.year) : undefined,
            mileageKm: trade.mileageKm ? Number(trade.mileageKm) : undefined,
            notes: trade.value ? `Customer's estimated value: ${formatPeso(parsePeso(trade.value))}` : "",
          }
        : null,
    )
  }, [hasTradeIn, trade, setTradeIn])

  return (
    <div className="grid overflow-hidden rounded-sm border border-border lg:grid-cols-[1.15fr_1fr]">
      {/* Inputs */}
      <div className="grid gap-7 bg-card p-6 sm:p-8">
        <Field
          label="Unit price"
          hint={
            standalone
              ? "Enter a unit's cash price or your budget. Every listing has this calculator pre-filled."
              : priceOnRequest || price === null
                ? "This unit is priced on request — enter the price from your quote or a budget."
                : "Cash price; edit to match a quoted price."
          }
        >
          {(a) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">₱</span>
              <TextInput
                {...a}
                inputMode="numeric"
                className="pl-8 font-mono"
                value={unitPrice ? unitPrice.toLocaleString("en-PH") : ""}
                placeholder="e.g. 1,850,000"
                onChange={(e) => setUnitPrice(parsePeso(e.target.value))}
              />
            </div>
          )}
        </Field>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={ids.down} className="font-mono text-[11px] tracking-[0.16em] uppercase">
              Down payment
            </label>
            <span className="font-mono text-sm">
              {downPct}% · <span className="text-muted-foreground">{formatPeso(calc.down)}</span>
            </span>
          </div>
          <input
            id={ids.down}
            type="range"
            min={10}
            max={80}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="mt-3 h-2 w-full cursor-pointer accent-[var(--brand)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>10%</span>
            <span>80%</span>
          </div>
        </div>

        <fieldset>
          <legend className="font-mono text-[11px] tracking-[0.16em] uppercase">Term</legend>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {TERMS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={term === t}
                onClick={() => setTerm(t)}
                className={cn(
                  "h-11 rounded-sm border font-mono text-sm transition-colors",
                  term === t ? "border-brand bg-brand text-white" : "border-border hover:border-foreground/40",
                )}
              >
                {t}
                <span className="ml-0.5 text-[10px] opacity-70">mo</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={ids.rate} className="font-mono text-[11px] tracking-[0.16em] uppercase">
              Est. interest rate (p.a.)
            </label>
            <span className="font-mono text-sm">{rate.toFixed(1)}%</span>
          </div>
          <input
            id={ids.rate}
            type="range"
            min={0}
            max={24}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-3 h-2 w-full cursor-pointer accent-[var(--brand)]"
          />
        </div>

        {/* Trade-in */}
        <div className="rounded-sm border border-dashed border-border p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={hasTradeIn}
              onChange={(e) => setHasTradeIn(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            <RepeatIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium">I have a truck to trade in</span>
          </label>
          {hasTradeIn ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Make">{(a) => <TextInput {...a} value={trade.make} onChange={(e) => setTrade({ ...trade, make: e.target.value })} placeholder="e.g. Isuzu" maxLength={40} />}</Field>
              <Field label="Model">{(a) => <TextInput {...a} value={trade.model} onChange={(e) => setTrade({ ...trade, model: e.target.value })} placeholder="e.g. Elf NHR" maxLength={60} />}</Field>
              <Field label="Year">{(a) => <TextInput {...a} inputMode="numeric" value={trade.year} onChange={(e) => setTrade({ ...trade, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2016" />}</Field>
              <Field label="Mileage (km)">{(a) => <TextInput {...a} inputMode="numeric" value={trade.mileageKm} onChange={(e) => setTrade({ ...trade, mileageKm: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder="210000" />}</Field>
              <Field label="Your estimate of its value" className="col-span-2" hint="We'll confirm the actual trade-in value after inspection.">
                {(a) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-muted-foreground">₱</span>
                    <TextInput {...a} inputMode="numeric" className="pl-8 font-mono" value={trade.value} onChange={(e) => setTrade({ ...trade, value: e.target.value.replace(/[^\d,]/g, "") })} placeholder="450,000" />
                  </div>
                )}
              </Field>
            </div>
          ) : null}
        </div>
      </div>

      {/* Read-out */}
      <div className="dark relative flex flex-col bg-asphalt p-6 text-concrete sm:p-8">
        <div className="grid-lines absolute inset-0 text-white opacity-40" aria-hidden />
        <div className="relative flex flex-1 flex-col">
          <p className="font-mono text-[11px] tracking-[0.22em] text-concrete/60 uppercase">Estimated monthly</p>
          <p className="mt-2 font-display text-6xl leading-none font-black tabular-nums sm:text-7xl" aria-live="polite">
            {unitPrice > 0 ? formatPeso(Math.round(calc.monthly)) : "—"}
          </p>
          <p className="mt-2 font-mono text-xs text-concrete/60">
            × {term} months at {rate.toFixed(1)}% p.a.
          </p>

          <dl className="mt-8 divide-y divide-white/10 border-y border-white/10 font-mono text-sm">
            {[
              ["Unit price", formatPeso(unitPrice)],
              [`Down payment (${downPct}%)`, `− ${formatPeso(calc.down)}`],
              ...(hasTradeIn && tradeValue > 0 ? [["Trade-in credit (est.)", `− ${formatPeso(tradeValue)}`]] : []),
              ["Amount financed", formatPeso(Math.round(calc.financed))],
              ["Total interest", formatPeso(Math.round(calc.totalInterest))],
              ["Total of payments", formatPeso(Math.round(calc.totalPayable))],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-concrete/60">{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          {standalone ? (
            <a
              href="#inventory"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
            >
              Pick a truck to quote <ArrowUpIcon className="size-4" />
            </a>
          ) : (
          <button
            type="button"
            disabled={unitPrice <= 0}
            onClick={() => {
              setAttach(true)
              document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-brand px-5 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {attach ? "Attached to your quote" : "Attach to my quote"} <ArrowDownIcon className="size-4" />
          </button>
          )}
          <p className="mt-4 text-xs leading-relaxed text-concrete/50">
            Estimate only — not a loan offer. Actual rates, down payment and terms depend on approval by the bank or financing partner.
          </p>
        </div>
      </div>
    </div>
  )
}
