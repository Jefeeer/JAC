import type { NextConfig } from "next"

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // OG images read photos from /public and fonts from /assets at runtime.
  outputFileTracingIncludes: {
    // route keys are globs; dynamic OG routes get a hashed suffix
    "/**/opengraph-image*": ["./assets/og/**", "./public/images/**"],
    "/opengraph-image*": ["./assets/og/**", "./public/images/**"],
  },
  experimental: {
    // Vercel caps request bodies at 4.5 MB; customer photos upload straight to
    // Supabase Storage via signed upload URLs, so actions only carry form fields.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ]
  },
}

export default nextConfig
