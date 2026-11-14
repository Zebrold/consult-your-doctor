import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatShortDate } from '@/components/patient/format'
import { BADGE_PRICES, badgeState, doctorRequirements, loadBadges, meetsRequirements } from '@/lib/badges'
import { loadDoctorReviews } from '@/lib/reviews'
import { requireDoctor } from '../_lib/doctor'
import { DoctorBadge } from '../_components/DoctorBadge'
import { DeskHead, DocBackHeader, DocBody } from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Verified badge | Doctor Portal' }
export const dynamic = 'force-dynamic'

/**
 * Verified badge, after the DeskDocBadge export: buy the badge (or ask the hospital to pay), which the Consult your Doctor
 * team checks before the blue tick shows on the doctor's profile and in search (lib/badges.ts).
 */
export default async function DoctorBadgePage() {
  const { admin, user, doctor } = await requireDoctor()
  const now = currentTime()
  const [{ ready, badges }, { data: me }, reviews] = await Promise.all([
    loadBadges(admin, { doctorIds: [doctor.id] }),
    admin.from('profiles').select('created_at, email, phone_number').eq('id', user.id).maybeSingle(),
    loadDoctorReviews(admin, doctor.id, 0),
  ])
  const s = badgeState(badges, now)
  const reqs = doctorRequirements({ registrationNumber: doctor.registrationNumber, image: doctor.image, joined: (me?.created_at as string | null) ?? null }, now)
  const renewable = !s.live?.endsAt || Date.parse(s.live.endsAt) - now <= 7 * 86_400_000

  const subtitle = 'A blue tick that tells patients our team has checked your profile'
  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Verified badge">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </DocBackHeader>
      <DocBody>
        <DeskHead title="Verified badge" subtitle={subtitle} />
        {!ready && <p className="mb-4 p-3.5 rounded-[14px] bg-[#FFF6E8] text-[13px] text-[#7A2E0E]">Verified badges are being set up. You can get yours here once that’s done.</p>}
        <DoctorBadge
          ready={ready}
          doctor={{
            name: doctorName(doctor.name),
            image: doctor.image,
            line: [doctor.specialty, doctor.experience ? `${doctor.experience} years` : null, doctor.hospital?.name].filter(Boolean).join(' · '),
            fee: doctor.fee,
            rating: reviews.summary.average,
            reviews: reviews.summary.count,
            hospital: doctor.hospital?.name ?? null,
          }}
          prices={{ monthly: BADGE_PRICES.doctor.monthly!, yearly: BADGE_PRICES.doctor.yearly! }}
          state={{
            liveUntil: s.live?.endsAt ? formatShortDate(s.upcoming?.endsAt ?? s.live.endsAt) : null,
            inReview: !!s.inReview,
            askedHospital: s.awaiting?.paidBy === 'hospital' ? { id: s.awaiting.id, plan: s.awaiting.plan } : null,
            rejected: s.rejected && !s.live && !s.inReview ? (s.rejected.reviewNote ?? 'See our note') : null,
            canBuy: !s.inReview && !s.upcoming && renewable && meetsRequirements(reqs),
          }}
          requirements={reqs}
          payer={{ name: doctorName(doctor.name), email: (me?.email as string | null) ?? doctor.email, phone: (me?.phone_number as string | null) ?? doctor.phone }}
        />
      </DocBody>
    </>
  )
}
