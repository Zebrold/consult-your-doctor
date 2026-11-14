import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { doctorName } from '@/components/patient/format'
import { ReviewsBoard, type BoardDoctor, type BoardReview } from '@/components/portal/ReviewsBoard'
import { loadReviewsFor, summarize, timeAgo } from '@/lib/reviews'
import { loadHospitalDoctors, requireHospital } from '../_lib/hospital'
import { DeskHead, HosBackHeader, HosBody } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Reviews | Hospital Portal' }
export const dynamic = 'force-dynamic'

/** "Dr. Vaibhav Mishra" → "Dr. Vaibhav" for the filter tabs; a name starting with an initial ("Dr. M. Iyer") stays whole. */
function shortName(name: string) {
  const full = doctorName(name)
  const parts = full.split(/\s+/)
  return parts.length > 2 && !/^[A-Za-z]\.?$/.test(parts[1]) ? parts.slice(0, 2).join(' ') : full
}

/**
 * Reviews, after the DeskHosReviews export: what patients wrote about the hospital and its doctors after a completed
 * visit, filtered by doctor, with the overall rating, its spread and each doctor's rating.
 */
export default async function HospitalReviewsPage() {
  const { admin, hospital } = await requireHospital()
  const now = currentTime()
  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const reviews = await loadReviewsFor(admin, { doctorIds: doctors.map((d) => d.id), hospitalId: hospital.id })

  const board: BoardReview[] = reviews.map((r) => ({
    id: `${r.kind}-${r.id}`,
    rating: r.rating,
    comment: r.comment,
    patientName: r.patientName,
    about: r.kind === 'hospital' ? `Rated ${hospital.name}` : `Saw ${r.doctor?.name ?? 'a doctor'}`,
    when: timeAgo(r.createdAt, now),
    key: r.kind === 'hospital' ? 'hospital' : (r.doctor?.id ?? 'doctor'),
  }))

  const byDoctor: BoardDoctor[] = doctors
    .map((d) => {
      const own = summarize(board.filter((r) => r.key === d.id).map((r) => r.rating))
      return { key: d.id, name: doctorName(d.name), short: shortName(d.name), average: own.average, count: own.count }
    })
    .sort((a, b) => b.count - a.count || (b.average ?? 0) - (a.average ?? 0) || a.name.localeCompare(b.name))

  const hospitalCount = board.filter((r) => r.key === 'hospital').length
  const tabs = [
    ...(hospitalCount ? [{ key: 'hospital', label: 'Hospital' }] : []),
    ...byDoctor.filter((d) => d.count).slice(0, 3).map((d) => ({ key: d.key, label: d.short })),
  ]
  const subtitle = `What patients say about ${hospital.name} and your doctors`

  return (
    <>
      <HosBackHeader backHref="/hospital/more" backLabel="Back to more" title="Reviews">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </HosBackHeader>
      <HosBody>
        <DeskHead title="Reviews" subtitle={subtitle} />
        <ReviewsBoard reviews={board} summary={summarize(board.map((r) => r.rating))} doctors={byDoctor} tabs={tabs} />
      </HosBody>
    </>
  )
}
