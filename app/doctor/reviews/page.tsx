import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { ReviewsBoard, type BoardReview } from '@/components/portal/ReviewsBoard'
import { loadReviewsFor, summarize, timeAgo } from '@/lib/reviews'
import { requireDoctor } from '../_lib/doctor'
import { DeskHead, DocBackHeader, DocBody } from '../_components/doc-ui'

export const metadata: Metadata = { title: 'Reviews | Doctor Portal' }
export const dynamic = 'force-dynamic'

/** The doctor's reviews, laid out like the hospital's (DeskHosReviews): the latest reviews, the rating and its spread. */
export default async function DoctorReviewsPage() {
  const { admin, doctor } = await requireDoctor()
  const now = currentTime()
  const reviews = await loadReviewsFor(admin, { doctorIds: [doctor.id] })
  const place = doctor.hospital?.name

  const board: BoardReview[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    patientName: r.patientName,
    about: place ? `Visited you at ${place}` : 'Visited you',
    when: timeAgo(r.createdAt, now),
    key: doctor.id,
  }))
  const subtitle = 'What patients say about you after a completed visit. Reviews show on your public profile.'

  return (
    <>
      <DocBackHeader backHref="/doctor/profile" backLabel="Back to profile" title="Reviews">
        <p className="mt-2.5 mx-1.5 text-[13px] leading-[1.5] text-[#DCE6FF]">{subtitle}</p>
      </DocBackHeader>
      <DocBody>
        <DeskHead title="Reviews" subtitle={subtitle} />
        <ReviewsBoard reviews={board} summary={summarize(board.map((r) => r.rating))} />
      </DocBody>
    </>
  )
}
