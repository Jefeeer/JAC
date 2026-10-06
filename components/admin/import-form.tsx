"use client"

import { useState, useTransition } from "react"
import { CheckCircle2Icon, DownloadIcon, LoaderIcon, UploadIcon } from "lucide-react"
import { btn } from "@/components/admin/ui"
import { importPartsAction } from "@/server/actions/admin"

const TEMPLATE = `part_number,name,category,price,stock_qty,reorder_level,oem_number,brand,unit,compatible_models,summary
JAC-1012010-ISF,Oil Filter — Cummins ISF 3.8,engine-filtration,780,64,20,5262311,JAC Genuine,pc,N55;N65;N75;N90,Full-flow spin-on oil filter
JAC-3502090-N,Rear Brake Shoe Set — N-Series,brakes,3950,18,6,,JAC Genuine,axle set,N35;N45;N55;N75,Riveted asbestos-free lining
`

export function ImportForm({ viaService }: { viaService: boolean }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; text: string; skipped?: string[] } | null>(null)

  return (
    <div className="grid gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          start(async () => {
            setResult(null)
            const res = await importPartsAction(fd)
            setResult(
              res.ok
                ? { ok: true, text: `${res.data?.inserted ?? 0} added · ${res.data?.updated ?? 0} updated`, skipped: res.data?.skipped }
                : { ok: false, text: res.error },
            )
          })
        }}
        className="grid gap-4 rounded-lg border-2 border-dashed border-border bg-card p-8 text-center"
      >
        <UploadIcon className="mx-auto size-8 text-muted-foreground" />
        <label className="mx-auto grid max-w-md gap-2 text-sm">
          <span className="font-semibold">Supplier price list</span>
          <input name="file" type="file" required accept={viaService ? ".csv,.xlsx,.xls" : ".csv"} className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-background" />
          <span className="text-xs text-muted-foreground">{viaService ? "CSV or Excel — processed by the JAC import service" : "CSV only (Excel imports need the Python service)"} · up to 2,000 rows</span>
        </label>
        <div className="flex justify-center gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending ? <LoaderIcon className="size-4 animate-spin" /> : null} Import & upsert
          </button>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="jac-parts-template.csv" className={btn.outline}>
            <DownloadIcon className="size-4" /> Template
          </a>
        </div>
      </form>
      {result ? (
        <div className={`rounded-md border p-4 text-sm ${result.ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5 text-destructive"}`} role="status">
          <p className="flex items-center gap-2 font-semibold">
            {result.ok ? <CheckCircle2Icon className="size-4 text-success" /> : null} {result.text}
          </p>
          {result.skipped?.length ? <p className="mt-2 text-muted-foreground">Skipped: {result.skipped.join(", ")}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
