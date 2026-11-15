import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { AccountPage } from '@/components/patient/AccountPage'
import { card } from '@/components/patient/app-ui'
import { doctorName, formatShortDate } from '@/components/patient/format'
import { MyReviewItem, ReviewQueue, type MyReview, type PendingVisit } from '@/components/patient/health/reviews'
import { patientAccount } from '@/lib/patient-account'
import { loadPatientVisits } from '@/lib/patient-visits'
import { timeAgo } from '@/lib/reviews'

export const metadata: Metadata = { title: 'My reviews' }

type ReviewRow = { appointment_id: string; doctor_id: string; rating: number; comment: string | null; tags?: string[] | null; created_at: string; updated_at?: string | null }

/** My reviews: visits waiting for a rating, and the reviews the patient has posted, to edit or delete. */
export default async function ReviewsPage() {
  const { user, admin, profile } = await patientAccount('/patient/reviews')
  const [visits, { data: rows }] = await Promise.all([
    loadPatientVisits(admin, user.id),
    admin.from('doctor_reviews').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }),
  ])
  const reviews = (rows ?? []) as ReviewRow[]
  const reviewed = new Set(reviews.map((r) => r.appointment_id))
  const byVisit = new Map(visits.map((v) => [v.id, v]))
  const now = currentTime()

  const pending: PendingVisit[] = visits
    .filter((v) => (v.status === 'completed' || v.status === 'visited') && v.doctor && !reviewed.has(v.id))
    .slice(0, 8)
    .map((v) => ({
      id: v.id,
      name: doctorName(v.doctor!.name),
      sub: [v.doctor!.specialty, v.hospital?.name].filter(Boolean).join(' · '),
      date: `Visited ${formatShortDate(v.at ?? `${v.date}T12:00:00+05:30`)}`,
    }))

  const mine: MyReview[] = reviews.map((r) => {
    const v = byVisit.get(r.appointment_id)
    return {
      appointmentId: r.appointment_id,
      doctor: doctorName(v?.doctor?.name),
      sub: [v?.doctor?.specialty, v?.hospital?.name].filter(Boolean).join(' · ') || 'Consultation',
      rating: r.rating,
      comment: r.comment,
      tags: Array.isArray(r.tags) ? r.tags : [],
      when: timeAgo(r.updated_at || r.created_at, now),
    }
  })
  const average = mine.length ? mine.reduce((s, r) => s + r.rating, 0) / mine.length : null

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="My reviews"
      subtitle="Rate your visits and help other patients choose the right care"
      phoneSubtitle={pending.length ? `${pending.length} ${pending.length === 1 ? 'visit' : 'visits'} waiting for your review` : 'Rate your visits and help others choose.'}
    >
      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <ReviewQueue visits={pending} />
          <section className={`${card} p-4 lg:p-[22px]`}>
            <h2 className="text-[16px] font-extrabold">Your reviews</h2>
            <p className="mt-0.5 text-[12.5px] lg:text-[13px] text-[#5B667A]">
              {mine.length ? `${mine.length} ${mine.length === 1 ? 'review' : 'reviews'} · shown on doctors’ pages` : 'Reviews you post show here.'}
            </p>
            <div className="mt-1">
              {mine.map((r) => (
                <MyReviewItem key={r.appointmentId} review={r} />
              ))}
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <section className={`${card} p-4 lg:p-[22px] grid grid-cols-2 gap-3`}>
            <span>
              <span className="block text-[12.5px] font-bold text-[#5B667A]">Reviews written</span>
              <span className="block mt-1 text-[26px] font-extrabold tabular-nums">{mine.length}</span>
            </span>
            <span>
              <span className="block text-[12.5px] font-bold text-[#5B667A]">Average you gave</span>
              <span className="block mt-1 text-[26px] font-extrabold tabular-nums">{average != null ? `★ ${average.toFixed(1)}` : '–'}</span>
            </span>
          </section>
          <section className={`${card} p-4 lg:p-[22px]`}>
            <h2 className="text-[16px] font-extrabold">Review guidelines</h2>
            <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-[#27324A] list-disc pl-5">
              <li>Only patients with a completed visit can post a review.</li>
              <li>Describe your own experience. Don&apos;t include phone numbers or other people&apos;s details.</li>
              <li>Your review shows on the doctor&apos;s page with your first name and initial. Our team may hide reviews that break these rules.</li>
              <li>You can edit or delete your review at any time.</li>
            </ul>
          </section>
        </div>
      </div>
    </AccountPage>
  )
}
