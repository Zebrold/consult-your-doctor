import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import Link from 'next/link'
import { AccountPage } from '@/components/patient/AccountPage'
import { card } from '@/components/patient/app-ui'
import { formatShortDate } from '@/components/patient/format'
import { CheckupPicker, type Checkup } from '@/components/patient/health/checkups'
import { patientAccount } from '@/lib/patient-account'
import { loadPatientLabs } from '@/lib/patient-visits'
import { getBookingFees } from '@/lib/booking-fees'
import { formatPercent, labDoorstepFee, labTestBookingFee, onlinePayable, pricedTests } from '@/lib/pricing'
import { toLatLng } from '@/lib/geo'

export const metadata: Metadata = { title: 'Health check-ups' }

/** A test that is a package of several: what labs call profiles, panels and check-ups. */
const PACKAGE = /package|full body|check[\s-]?up|health ?check|profile|panel|wellness|master|screening/i

function kindOf(name: string) {
  if (/full body|master|complete health|executive/i.test(name)) return 'Full body'
  if (/thyroid/i.test(name)) return 'Thyroid'
  if (/diabet|sugar|hba1c|glucose/i.test(name)) return 'Diabetes'
  if (/heart|cardiac|lipid|cholesterol/i.test(name)) return 'Heart'
  if (/women|female|pcod|pcos/i.test(name)) return 'Women’s health'
  if (/liver|lft/i.test(name)) return 'Liver'
  if (/kidney|renal|kft/i.test(name)) return 'Kidney'
  if (/vitamin/i.test(name)) return 'Vitamins'
  return 'Health check'
}

type CenterRow = {
  id: string
  name: string | null
  city: string | null
  test_prices: Record<string, number | string> | null
  doorstep_enabled?: boolean | null
  doorstep_fee?: number | string | null
  latitude?: number | null
  longitude?: number | null
}

/** Health check-ups: the packages partner labs list with their own prices, booked through the lab booking page. */
export default async function CheckupsPage() {
  const { user, admin, profile } = await patientAccount('/patient/checkups')
  const [{ data: centers }, fees, labs] = await Promise.all([
    // `*` because the home collection and map pin columns come from later migrations.
    admin.from('diagnostic_centers').select('*').eq('status', 'active'),
    getBookingFees(),
    loadPatientLabs(admin, user.id),
  ])

  const checkups: Checkup[] = ((centers ?? []) as CenterRow[]).flatMap((c) => {
    const pin = toLatLng(c.latitude, c.longitude)
    return pricedTests(c.test_prices)
      .filter((t) => PACKAGE.test(t.name))
      .map((t) => ({
        key: `${c.id}:${t.name}`,
        kind: kindOf(t.name),
        name: t.name,
        centerId: c.id,
        centerName: c.name || 'Lab',
        city: c.city,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        price: t.price,
        payNow: onlinePayable(labTestBookingFee(t.price, fees.diagnosticPercent), fees.conveniencePercent).total,
        doorstep: c.doorstep_enabled === true,
        doorstepFee: labDoorstepFee(c),
      }))
  })

  // The patient's last check-up: the newest lab booking of a package with a report.
  const last = labs.find((b) => (b.status === 'report_sent' || b.results) && PACKAGE.test(b.tests))
  const lastDate = last ? last.results?.reportedAt ?? (last.date ? `${last.date}T12:00:00+05:30` : last.createdAt) : null
  const months = lastDate ? Math.floor((currentTime() - Date.parse(lastDate)) / (30.4 * 86_400_000)) : null

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Health check-ups"
      subtitle="Packages from partner labs at the lab’s own prices, some with sample collection at home"
      phoneSubtitle="Packages from partner labs, some with home collection."
    >
      {last && lastDate && (
        <section className={`${card} p-4 lg:p-[22px] flex flex-col md:flex-row md:items-center gap-3`}>
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] font-extrabold">Your last check-up</span>
            <span className="block mt-0.5 text-[13px] text-[#5B667A]">
              {[last.tests, formatShortDate(lastDate), last.center?.name].filter(Boolean).join(' · ')}
              {months != null && months >= 1 ? ` · ${months} ${months === 1 ? 'month' : 'months'} ago` : ''}
            </span>
          </span>
          <Link href="/patient/records?type=lab" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline">
            View report
          </Link>
        </section>
      )}
      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <CheckupPicker checkups={checkups} percentLabel={formatPercent(fees.diagnosticPercent)} />
      </div>
    </AccountPage>
  )
}
