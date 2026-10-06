import { SectionHeading } from "@/components/shared/section-heading"
import { TruckCard } from "@/components/shared/truck-card"
import type { Truck } from "@/types/domain"

export function FeaturedTrucks({ trucks }: { trucks: Truck[] }) {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="featured-title">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <SectionHeading
          bay="01"
          label="On the floor"
          title={<span id="featured-title">Fleet-ready units</span>}
          description="Hand-picked from this month's stock across our branches. Every unit is PDI-checked, registered-ready and backed by JAC after-sales."
          action={{ href: "/trucks", label: "Full inventory" }}
        />

        {trucks.length === 0 ? (
          <p className="mt-12 rounded-sm border border-dashed border-border p-10 text-center text-muted-foreground">
            New stock is being unloaded. Check back soon — or call any branch for incoming units.
          </p>
        ) : (
          <div className="-mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
            {trucks.map((truck, i) => (
              <TruckCard key={truck.id} truck={truck} priority={i === 0} className="w-[84vw] shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
