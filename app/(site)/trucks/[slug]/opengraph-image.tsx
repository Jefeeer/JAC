import { ImageResponse } from "next/og"
import { OG, OG_SIZE, OgStripe, OgWordmark, ogFonts, ogPhoto, ogPrice } from "@/lib/og"
import { getTruckBySlug, truckImageForModel } from "@/server/queries/catalog"
import { BODY_TYPE_LABELS } from "@/types/domain"

export const alt = "JAC truck at JAC Motors Philippines"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const truck = await getTruckBySlug(slug)
  const cover = truck?.images.find((i) => i.isPrimary) ?? truck?.images[0] ?? (truck ? truckImageForModel(truck.model) : null)
  const [fonts, photo] = await Promise.all([ogFonts(), ogPhoto(cover?.url, 640, 630)])

  const specs = truck
    ? ([
        ["Payload", truck.payloadTons ? `${truck.payloadTons} T` : null],
        ["Power", truck.horsepower ? `${truck.horsepower} hp` : null],
        ["Body", BODY_TYPE_LABELS[truck.bodyType]],
      ].filter(([, v]) => v) as [string, string][])
    : []
  const price = truck ? (truck.priceOnRequest || truck.price == null ? "Price on request" : ogPrice(truck.price)) : null

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.asphalt, fontFamily: "Archivo", color: "#fff" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 600, padding: "52px 56px 0", justifyContent: "space-between" }}>
          <OgWordmark height={40} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Mono", fontSize: 18, letterSpacing: 5, color: OG.signal }}>
              {truck ? `${truck.condition === "new" ? "NEW" : "USED"} · ${truck.year}` : "JAC TRUCKS"}
            </span>
            <span style={{ fontFamily: "Shoulders", fontSize: (truck?.title.length ?? 0) > 26 ? 72 : 88, lineHeight: 0.9, textTransform: "uppercase", marginTop: 14 }}>
              {truck?.title ?? "JAC Trucks"}
            </span>
            <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
              {specs.map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", border: "2px solid #34363c", padding: "10px 16px" }}>
                  <span style={{ fontFamily: "Mono", fontSize: 13, letterSpacing: 3, color: OG.muted }}>{k.toUpperCase()}</span>
                  <span style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{v}</span>
                </div>
              ))}
            </div>
            {price ? <span style={{ fontFamily: "Shoulders", fontSize: 54, color: OG.red, marginTop: 24 }}>{price}</span> : null}
          </div>
          <div style={{ display: "flex", marginLeft: -56, marginTop: 24 }}>
            <OgStripe />
          </div>
        </div>
        <div style={{ display: "flex", width: 600, height: 630, position: "relative", background: "#222" }}>
          {photo ? <img src={photo} width={640} height={630} alt="" style={{ objectFit: "cover" }} /> : null}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: OG.red, display: "flex" }} />
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  )
}
