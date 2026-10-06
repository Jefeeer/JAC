import type { Metadata } from "next"
import { PageHeader } from "@/components/portal/page-header"
import { CompanyForm, ProfileForm } from "@/components/portal/profile-forms"
import { requireUser } from "@/server/auth"
import { getCompany } from "@/server/queries/portal"

export const metadata: Metadata = { title: "Profile & company" }

export default async function ProfilePage() {
  const session = await requireUser("/account/profile")
  const company = await getCompany(session.customer?.companyId ?? null)

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & company" />
      <div className="grid max-w-4xl gap-8">
        <section className="rounded-sm border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase">You</h2>
          <div className="mt-6">
            <ProfileForm email={session.email} initial={{ fullName: session.profile.fullName ?? "", phone: session.profile.phone ?? "" }} />
          </div>
        </section>
        <section className="rounded-sm border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold uppercase">Company / fleet account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buying or servicing for a business? Add your company so quotes and invoices carry the right name and TIN.
          </p>
          <div className="mt-6">
            <CompanyForm
              exists={Boolean(company)}
              initial={{
                name: company?.name ?? "",
                tin: company?.tin ?? "",
                industry: company?.industry ?? "",
                fleetSize: company?.fleet_size ?? undefined,
                email: company?.email ?? "",
                phone: company?.phone ?? "",
                address: company?.address ?? "",
                city: company?.city ?? "",
                province: company?.province ?? "",
              }}
            />
          </div>
        </section>
      </div>
    </>
  )
}
