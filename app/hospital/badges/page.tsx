import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatShortDate } from '@/components/patient/format'
import { BADGE_PRICES, badgeState, doctorRequirements, loadBadges, meetsRequirements } from '@/lib/badges'
import { loadHospitalDoctors, requireHospital } from '../_lib/hospital'
import { HospitalBadges, type BadgeDoctorRow, type HospitalBadgeState } from '../_components/HospitalBadges'
import { DeskHead, HosBackHeader, HosBody } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Verified badges | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** Why a doctor can't be picked yet, in a few words. */
function missingNote(label: string, note?: string) {
  if (label.startsWith('Medical registration')) return 'Registration number missing'
  if (label.startsWith('Profile photo')) return 'Profile photo missing'
  if (label.startsWith('Active')) return note ? `Must be active for ${note.replace(' to go', '')}` : 'Must be active for 30 days'
  return label
}

/**
 * Verified badges, after the DeskHosBadges export: the hospital's own badge and its doctors'. The hospital pays online;
 * the Consult your Doctor team checks each badge before the blue tick shows (lib/badges.ts).
 */
export default async function HospitalBadgesPage() {
  const { admin, user, hospital } = await requireHospital()
  const now = currentTime()
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const [{ ready, badges }, { data: regs }, { data: me }] = await Promise.all([
    loadBadges(admin, { hospitalId: hospital.id, doctorIds: doctors.map((d) => d.id) }),
    doctors.length ? admin.from('doctors').select('*').in('id', doctors.map((d) => d.id)) : Promise.resolve({ data: [] }),
    admin.from('profiles').select('email, phone_number').eq('id', user.id).maybeSingle(),
  ])
  const registration = new Map(((regs ?? []) as { id: string; registration_number?: string | null }[]).map((r) => [r.id, r.registration_number ?? null]))

  const own = badgeState(badges.filter((b) => b.subject === 'hospital'), now)
  const hospitalState: HospitalBadgeState = {
    live: hospital.status === 'active',
    activeUntil: own.live?.endsAt ? formatShortDate(own.live.endsAt) : null,
    renewedUntil: own.upcoming?.endsAt ? formatShortDate(own.upcoming.endsAt) : null,
    inReview: !!own.inReview,
    rejected: own.rejected && !own.live && !own.inReview ? own.rejected.reviewNote : null,
    canRenew: !own.inReview && !own.upcoming && (!own.live?.endsAt || Date.parse(own.live.endsAt) - now <= 7 * 86_400_000),
  }

  const rows: BadgeDoctorRow[] = doctors.map((d) => {
    const s = badgeState(badges.filter((b) => b.subject === 'doctor' && b.doctorId === d.id), now)
    const reqs = doctorRequirements({ registrationNumber: registration.get(d.id) ?? null, image: d.image, joined: d.joined }, now)
    const missing = reqs.find((r) => r.met === false)
    const renewable = !s.live?.endsAt || Date.parse(s.live.endsAt) - now <= 7 * 86_400_000
    const state: BadgeDoctorRow['state'] = s.inReview ? 'review' : s.live ? 'live' : s.awaiting?.paidBy === 'hospital' ? 'asked' : 'none'
    const note = s.inReview
      ? 'Paid · our team is checking it'
      : s.live
        ? `Active until ${formatShortDate(s.upcoming?.endsAt ?? s.live.endsAt!)}`
        : s.awaiting?.paidBy === 'hospital'
          ? `Asked you to pay · ${s.awaiting.plan === 'yearly' ? 'yearly' : 'monthly'} plan`
          : missing
            ? missingNote(missing.label, missing.note)
            : s.rejected
              ? `Not approved: ${s.rejected.reviewNote ?? 'see our note'}`
              : 'All requirements met'
    return {
      id: d.id,
      name: doctorName(d.name),
      specialty: d.specialty || d.department,
      state,
      note,
      warn: !s.live && !s.inReview && !!missing,
      selectable: !s.inReview && !s.upcoming && renewable && meetsRequirements(reqs),
      price: s.awaiting?.paidBy === 'hospital' ? s.awaiting.amount : BADGE_PRICES.doctor.monthly!,
      askedId: s.awaiting?.paidBy === 'hospital' ? s.awaiting.id : null,
    }
  })

  const subtitle = 'Blue ticks for your hospital and doctors, so patients know our team has checked them'
  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Verified badges">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Verified badges" subtitle={subtitle} />
        {!ready && (
          <p className="mb-4 p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Verified badges are being set up. You can buy them here once that’s done.</p>
        )}
        <HospitalBadges
          ready={ready}
          hospital={{ name: hospital.name, price: BADGE_PRICES.hospital.monthly!, state: hospitalState }}
          doctors={rows}
          payer={{ name: hospital.name, email: (me?.email as string | null) ?? hospital.email, phone: (me?.phone_number as string | null) ?? hospital.phone }}
        />
      </HosBody>
    </>
  )
}
