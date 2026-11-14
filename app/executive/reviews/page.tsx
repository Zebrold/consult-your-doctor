import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { doctorName, istDateKey } from '@/components/patient/format'
import { publicName, timeAgo } from '@/lib/reviews'
import { currentTime, requireExecutivePage } from '../_lib/ops'
import { Card, ExePage, Stat, Stats, Table, count, td, th } from '../_components/ui'
import { ReviewModeration, type ModReview } from '../_components/ReviewModeration'

export const metadata: Metadata = { title: 'Review moderation' }
export const dynamic = 'force-dynamic'

type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

const DAY = 86_400_000
// A review that shares contact details needs a look before it stays public.
const PHONE = /(?:\+?91[\s-]?)?\b[6-9](?:[\s-]?\d){9}\b/
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

type DocRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  is_published: boolean
  patient: Joined<{ full_name: string | null }>
  doctors: Joined<{ id: string; specialty: string | null; profiles: Joined<{ full_name: string | null }>; hospitals: Joined<{ name: string | null }> }>
}
type HosRow = { id: string; rating: number; comment: string | null; created_at: string; is_published: boolean; patient: Joined<{ full_name: string | null }>; hospitals: Joined<{ id: string; name: string | null; city: string | null }> }

/**
 * Review moderation after DeskExeReviews: patients' reviews of doctors and hospitals from the last 90 days, the ones that
 * need a look (1 or 2 stars, a phone number or an email in them) first, with Hide and Publish again.
 */
export default async function ExecutiveReviewsPage() {
  const { admin, profile } = await requireExecutivePage('reviews')
  const now = currentTime()
  const since = new Date(now - 90 * DAY).toISOString()
  const [docRes, hosRes, hiddenDoc, hiddenHos] = await Promise.all([
    admin
      .from('doctor_reviews')
      .select('id, rating, comment, created_at, is_published, patient:profiles!doctor_reviews_patient_id_fkey ( full_name ), doctors ( id, specialty, profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name ) )')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000),
    admin
      .from('hospital_reviews')
      .select('id, rating, comment, created_at, is_published, patient:profiles!hospital_reviews_patient_id_fkey ( full_name ), hospitals ( id, name, city )')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000),
    admin.from('doctor_reviews').select('id', { count: 'exact', head: true }).eq('is_published', false),
    admin.from('hospital_reviews').select('id', { count: 'exact', head: true }).eq('is_published', false),
  ])

  const flagsOf = (rating: number, comment: string | null) => [
    ...(rating <= 2 ? [`${rating} star${rating === 1 ? '' : 's'}`] : []),
    ...(comment && PHONE.test(comment) ? ['has a phone number'] : []),
    ...(comment && EMAIL.test(comment) ? ['has an email address'] : []),
  ]

  const doctorRows = (docRes.data ?? []) as unknown as DocRow[]
  const hospitalRows = (hosRes.error ? [] : (hosRes.data ?? [])) as unknown as HosRow[]
  const reviews: ModReview[] = [
    ...doctorRows.map((r): ModReview => {
      const d = one(r.doctors)
      return {
        id: r.id,
        kind: 'doctor',
        rating: r.rating,
        comment: r.comment,
        patient: publicName(one(r.patient)?.full_name),
        about: doctorName(one(d?.profiles)?.full_name ?? 'Doctor'),
        aboutSub: [d?.specialty, one(d?.hospitals)?.name].filter(Boolean).join(' · ') || null,
        when: timeAgo(r.created_at, now),
        published: r.is_published,
        flags: flagsOf(r.rating, r.comment),
      }
    }),
    ...hospitalRows.map((r): ModReview => {
      const h = one(r.hospitals)
      return {
        id: r.id,
        kind: 'hospital',
        rating: r.rating,
        comment: r.comment,
        patient: publicName(one(r.patient)?.full_name),
        about: h?.name ?? 'Hospital',
        aboutSub: h?.city ?? null,
        when: timeAgo(r.created_at, now),
        published: r.is_published,
        flags: flagsOf(r.rating, r.comment),
      }
    }),
  ]

  // Newest first across both kinds.
  const created = new Map([...doctorRows.map((r) => [r.id, r.created_at] as const), ...hospitalRows.map((r) => [r.id, r.created_at] as const)])
  reviews.sort((a, b) => (created.get(b.id) ?? '').localeCompare(created.get(a.id) ?? ''))

  const month = istDateKey(now).slice(0, 7)
  const published = reviews.filter((r) => r.published)
  const publishedThisMonth = [...doctorRows, ...hospitalRows].filter((r) => r.is_published && istDateKey(r.created_at).slice(0, 7) === month).length
  const toCheck = published.filter((r) => r.flags.length).length
  const average = published.length ? Math.round((published.reduce((s, r) => s + r.rating, 0) / published.length) * 10) / 10 : null

  // Lowest rated partners over the 90 days, with at least three published reviews.
  const groups = new Map<string, { name: string; sub: string; ratings: number[] }>()
  for (const r of doctorRows) {
    if (!r.is_published) continue
    const d = one(r.doctors)
    if (!d) continue
    const g = groups.get(`d-${d.id}`) ?? { name: doctorName(one(d.profiles)?.full_name ?? 'Doctor'), sub: ['Doctor', d.specialty].filter(Boolean).join(' · '), ratings: [] }
    g.ratings.push(r.rating)
    groups.set(`d-${d.id}`, g)
  }
  for (const r of hospitalRows) {
    if (!r.is_published) continue
    const h = one(r.hospitals)
    if (!h) continue
    const g = groups.get(`h-${h.id}`) ?? { name: h.name ?? 'Hospital', sub: 'Hospital', ratings: [] }
    g.ratings.push(r.rating)
    groups.set(`h-${h.id}`, g)
  }
  const lowest = Array.from(groups.values())
    .filter((g) => g.ratings.length >= 3)
    .map((g) => ({ ...g, average: g.ratings.reduce((s, x) => s + x, 0) / g.ratings.length }))
    .sort((a, b) => a.average - b.average)
    .slice(0, 5)

  return (
    <ExePage name={profile.fullName} title="Review moderation" subtitle="Reviews that need a check on doctor and hospital pages">
      <Stats>
        <Stat label="Waiting for a check" value={toCheck} note="Low ratings or contact details" tone={toCheck ? 'warn' : undefined} />
        <Stat label="Published this month" value={count(publishedThisMonth)} note="Shown on public pages" />
        <Stat label="Hidden" value={(hiddenDoc.count ?? 0) + (hiddenHos.count ?? 0)} note="Taken off public pages" />
        <Stat label="Average rating" value={average ?? '—'} note="Last 90 days, published" tone="blue" />
      </Stats>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <Card title="Reviews" sub="Last 90 days. Hiding takes a review off the doctor or hospital page and the home page.">
          <ReviewModeration reviews={reviews} />
        </Card>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Lowest rated partners" sub="Last 90 days, three or more reviews">
            {lowest.length === 0 ? (
              <p className="text-[13px] text-[#5B667A]">Not enough reviews yet.</p>
            ) : (
              <Table min={300}>
                <thead>
                  <tr>
                    <th className={th}>Partner</th>
                    <th className={`${th} text-right`}>Rating</th>
                    <th className={`${th} text-right`}>Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {lowest.map((g) => (
                    <tr key={g.name + g.sub}>
                      <td className={td}>
                        <span className="block font-extrabold">{g.name}</span>
                        <span className="block text-[12px] text-[#5B667A]">{g.sub}</span>
                      </td>
                      <td className={`${td} text-right font-extrabold whitespace-nowrap`}>{g.average.toFixed(1)} ★</td>
                      <td className={`${td} text-right tabular-nums`}>{g.ratings.length}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card title="Review guidelines">
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {['No phone numbers, emails or other people’s details', 'Claims about cures or medical outcomes are checked first', 'No abusive language', 'Only patients with a checked-in or completed visit can review'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-[#2A4DD0] shrink-0" strokeWidth={2.6} />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </ExePage>
  )
}
