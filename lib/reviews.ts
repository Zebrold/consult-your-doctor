import type { createAdminClient } from '@/lib/supabase/admin'
import { doctorName } from '@/components/patient/format'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null
const one = <T,>(v: Joined<T> | undefined) => (Array.isArray(v) ? v[0] : v) ?? null

// Patients' reviews of doctors (doctor_reviews, from the 20261009 migration). A patient rates a consultation once it
// is done; published reviews show on the doctor's public profile, in the doctor's portal and on the home page. Only the
// patient's first name and initial are ever shown.

export type Review = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  patientName: string
  doctor: { id: string; name: string; specialty: string | null } | null
}

export type ReviewSummary = { count: number; average: number | null; distribution: Record<1 | 2 | 3 | 4 | 5, number> }

const EMPTY: ReviewSummary = { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }

/** "Priya Sharma" → "Priya S." */
export function publicName(fullName: string | null | undefined) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Patient'
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]
}

export function summarize(ratings: number[]): ReviewSummary {
  if (!ratings.length) return EMPTY
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary['distribution']
  for (const r of ratings) if (r >= 1 && r <= 5) distribution[Math.round(r) as 1 | 2 | 3 | 4 | 5]++
  return { count: ratings.length, average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10, distribution }
}

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  patient: Joined<{ full_name: string | null }>
  doctors?: Joined<{ id: string; specialty: string | null; profiles: Joined<{ full_name: string | null }> }>
}

function toReview(r: ReviewRow): Review {
  const doctor = one(r.doctors)
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    patientName: publicName(one(r.patient)?.full_name),
    doctor: doctor ? { id: doctor.id, name: doctorName(one(doctor.profiles)?.full_name ?? 'Doctor'), specialty: doctor.specialty } : null,
  }
}

/** A doctor's rating summary and latest written reviews. */
export async function loadDoctorReviews(admin: Admin, doctorId: string, limit = 6): Promise<{ summary: ReviewSummary; reviews: Review[] }> {
  const [ratings, latest] = await Promise.all([
    admin.from('doctor_reviews').select('rating').eq('doctor_id', doctorId).eq('is_published', true).limit(10000),
    admin
      .from('doctor_reviews')
      .select('id, rating, comment, created_at, patient:profiles!doctor_reviews_patient_id_fkey ( full_name )')
      .eq('doctor_id', doctorId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])
  if (ratings.error || latest.error) return { summary: EMPTY, reviews: [] }
  return {
    summary: summarize(((ratings.data ?? []) as { rating: number }[]).map((r) => r.rating)),
    reviews: ((latest.data ?? []) as unknown as ReviewRow[]).map(toReview),
  }
}

/** The newest reviews across all doctors, for the home page. With `withText`, only reviews that have a comment. */
export async function loadRecentReviews(admin: Admin, limit = 8, withText = true): Promise<{ reviews: Review[]; summary: ReviewSummary }> {
  let query = admin
    .from('doctor_reviews')
    .select(
      'id, rating, comment, created_at, patient:profiles!doctor_reviews_patient_id_fkey ( full_name ), doctors ( id, specialty, profiles!doctors_profile_id_fkey ( full_name ) )',
    )
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (withText) query = query.not('comment', 'is', null)
  const [latest, ratings] = await Promise.all([query, admin.from('doctor_reviews').select('rating').eq('is_published', true).limit(20000)])
  if (latest.error || ratings.error) return { reviews: [], summary: EMPTY }
  return {
    reviews: ((latest.data ?? []) as unknown as ReviewRow[]).map(toReview).filter((r) => !withText || r.comment?.trim()),
    summary: summarize(((ratings.data ?? []) as { rating: number }[]).map((r) => r.rating)),
  }
}

/** "3 days ago", "2 weeks ago", … for review dates. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  if (days < 14) return days === 1 ? 'yesterday' : `${days} days ago`
  const weeks = Math.round(days / 7)
  if (days < 60) return `${weeks} weeks ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} months ago`
  const years = Math.round(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}
