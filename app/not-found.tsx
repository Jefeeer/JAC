import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export default function NotFound() {
  return (
    <main className="dark grain relative flex min-h-svh flex-col bg-asphalt text-concrete">
      <div className="hazard h-2" aria-hidden />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 sm:px-6">
        <Link href="/" className="mt-6 self-start" aria-label="JAC Motors — home">
          <Logo />
        </Link>
        <div className="flex flex-1 flex-col justify-center py-16">
          <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">Error 404 · Wrong turn</p>
          <h1 className="mt-4 text-[clamp(4rem,16vw,14rem)] leading-[0.8] font-black uppercase">
            Road
            <br />
            <span className="text-outline">closed.</span>
          </h1>
          <p className="mt-8 max-w-md text-concrete/70">
            The page you&apos;re looking for has moved or never existed. Let&apos;s get you back on the highway.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-12 items-center rounded-sm bg-brand px-6 font-wide text-xs font-bold tracking-[0.14em] text-white uppercase">
              Home
            </Link>
            <Link href="/trucks" className="inline-flex h-12 items-center rounded-sm border border-white/20 px-6 text-sm">
              Trucks
            </Link>
            <Link href="/parts" className="inline-flex h-12 items-center rounded-sm border border-white/20 px-6 text-sm">
              Parts
            </Link>
            <Link href="/book-service" className="inline-flex h-12 items-center rounded-sm border border-white/20 px-6 text-sm">
              Book service
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
