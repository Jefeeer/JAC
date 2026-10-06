import { ImageResponse } from "next/og"
import { OG, OG_SIZE, OgStripe, OgWordmark, ogFonts, ogPhoto } from "@/lib/og"

export const alt = "JAC Motors Philippines — trucks, genuine parts and service across 7 branches"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image() {
  const [fonts, photo] = await Promise.all([ogFonts(), ogPhoto("/images/jac-heavy-cargo-8x4.webp", 1200, 630)])
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.asphalt, position: "relative", fontFamily: "Archivo" }}>
        {photo ? <img src={photo} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} /> : null}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(20,21,24,0.97) 0%, rgba(20,21,24,0.88) 48%, rgba(20,21,24,0.25) 100%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px 0", width: "100%" }}>
          <OgWordmark height={52} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Mono", fontSize: 20, letterSpacing: 6, color: OG.signal }}>TRUCKS · GENUINE PARTS · SERVICE</span>
            <span style={{ fontFamily: "Shoulders", fontSize: 128, lineHeight: 0.88, color: "#fff", textTransform: "uppercase", marginTop: 18, maxWidth: 760 }}>
              Built to keep you moving.
            </span>
            <div style={{ display: "flex", gap: 28, marginTop: 30, fontSize: 24, color: OG.muted }}>
              <span>7 branches · Luzon & Visayas</span>
              <span style={{ color: "#fff", fontWeight: 700 }}>24/7 breakdown line</span>
            </div>
          </div>
          <div style={{ display: "flex", marginLeft: -64, marginRight: -64, marginTop: 36 }}>
            <OgStripe />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  )
}
