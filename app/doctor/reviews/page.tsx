import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { ReviewsBoard, type BoardReview } from '@/components/portal/ReviewsBoard'
import { loadReviewsFor, summarize, timeAgo } from '@/lib/reviews'
import { requireDoctor } from '../_lib/doctor'
import { DeskHead, DocBody, DocHeader } from '../_components/doc-ui'

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
  const subtitle = 'What your patients say about their visits'

  return (
    <>
      <DocHeader doctor={{ name: doctor.name, image: doctor.image }} title="Reviews" subtitle={subtitle} />
      <DocBody>
        <DeskHead title="Reviews" subtitle={subtitle} />
        <ReviewsBoard reviews={board} summary={summarize(board.map((r) => r.rating))} />
      </DocBody>
    </>
  )
}
