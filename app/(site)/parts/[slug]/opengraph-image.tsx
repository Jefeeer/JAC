import { ImageResponse } from "next/og"
import { OG, OG_SIZE, OgStripe, OgWordmark, ogFonts, ogPhoto, ogPrice } from "@/lib/og"
import { getPartBySlug } from "@/server/queries/catalog"

export const alt = "Genuine JAC part at JAC Motors Philippines"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const part = await getPartBySlug(slug)
  const [fonts, photo] = await Promise.all([ogFonts(), ogPhoto(part?.imageUrl ?? "/images/parts-shelves.webp", 1200, 630)])
  const models = part ? [...new Set(part.compatibility.map((c) => c.model))].slice(0, 6) : []
  const price = part ? (part.priceOnRequest || part.price == null ? "Price on request" : ogPrice(part.price)) : null

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.asphalt, position: "relative", fontFamily: "Archivo", color: "#fff" }}>
        {photo ? <img src={photo} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} /> : null}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(20,21,24,0.97) 0%, rgba(20,21,24,0.9) 60%, rgba(20,21,24,0.55) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 64px 0", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <OgWordmark height={40} />
            <span style={{ fontFamily: "Mono", fontSize: 18, letterSpacing: 4, color: OG.asphalt, background: OG.signal, padding: "8px 14px" }}>GENUINE PARTS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Mono", fontSize: 26, letterSpacing: 3, color: OG.red }}>{part?.partNumber ?? ""}</span>
            <span style={{ fontFamily: "Shoulders", fontSize: (part?.name.length ?? 0) > 34 ? 76 : 96, lineHeight: 0.9, textTransform: "uppercase", marginTop: 10, maxWidth: 1000 }}>
              {part?.name ?? "Genuine JAC parts"}
            </span>
            {models.length ? (
              <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
                <span style={{ fontFamily: "Mono", fontSize: 16, letterSpacing: 3, color: OG.muted }}>FITS</span>
                {models.map((m) => (
                  <span key={m} style={{ fontSize: 22, fontWeight: 700, border: "2px solid #44464c", padding: "4px 12px" }}>
                    {m}
                  </span>
                ))}
              </div>
            ) : null}
            {price ? <span style={{ fontFamily: "Shoulders", fontSize: 52, marginTop: 20 }}>{price}</span> : null}
          </div>
          <div style={{ display: "flex", marginLeft: -64, marginRight: -64, marginTop: 24 }}>
            <OgStripe />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  )
}
