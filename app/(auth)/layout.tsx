import { SiteHeader } from "@/components/layout/site-header"

/** Sign-in pages: site header only — no footer or marketing chrome. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  )
}
