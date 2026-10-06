import Image from "next/image"
import {
  CircleDotIcon,
  CogIcon,
  DiscIcon,
  DropletIcon,
  FilterIcon,
  LightbulbIcon,
  MoveVerticalIcon,
  PackageIcon,
  ThermometerIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "engine-filtration": FilterIcon,
  brakes: DiscIcon,
  "suspension-steering": MoveVerticalIcon,
  "clutch-transmission": CogIcon,
  electrical: ZapIcon,
  cooling: ThermometerIcon,
  "body-lighting": LightbulbIcon,
  "tyres-wheels": CircleDotIcon,
  "fluids-lubricants": DropletIcon,
}

/**
 * Part photo, or — when we don't have one yet — a technical "blueprint"
 * plate with the category glyph and part number, so the catalog never shows
 * an empty grey box.
 */
export function PartVisual({
  imageUrl,
  partNumber,
  name,
  categorySlug,
  size = "md",
  className,
  priority,
}: {
  imageUrl: string | null
  partNumber: string
  name: string
  categorySlug: string
  size?: "sm" | "md" | "lg"
  className?: string
  priority?: boolean
}) {
  const Icon = CATEGORY_ICONS[categorySlug] ?? PackageIcon

  if (imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          priority={priority}
          sizes={size === "lg" ? "(min-width: 1024px) 45vw, 100vw" : size === "md" ? "320px" : "96px"}
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div className={cn("dark relative grid place-items-center overflow-hidden bg-[oklch(0.22_0.03_250)] text-concrete", className)} role="img" aria-label={`${name} — illustration`}>
      <div className="grid-lines absolute inset-0 text-white opacity-50" aria-hidden />
      <div className="absolute inset-[12%] rounded-full border border-dashed border-white/15" aria-hidden />
      <Icon className={cn("relative text-white/80", size === "lg" ? "size-24" : size === "md" ? "size-12" : "size-6")} strokeWidth={1.1} aria-hidden />
      {size !== "sm" ? (
        <>
          {/* dimension line */}
          <span className="absolute inset-x-[18%] bottom-[16%] flex items-center gap-2 text-white/40" aria-hidden>
            <span className="h-px flex-1 bg-current" />
            <span className="font-mono text-[9px] tracking-widest">{size === "lg" ? "FIG. 1" : "FIG"}</span>
            <span className="h-px flex-1 bg-current" />
          </span>
          <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white/60" aria-hidden>
            {partNumber}
          </span>
        </>
      ) : null}
    </div>
  )
}
