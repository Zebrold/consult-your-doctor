'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrationHint } from '@/lib/desk-payments'
import { REVIEW_TAGS } from '@/lib/reviews'

type Result = { ok: true } | { ok: false; error: string }

const FeedbackInput = z.object({
  appointmentId: z.string().uuid(),
  // Doctor feedback
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
  doctorRating: z.number().int().min(1, 'Choose a doctor rating from 1 to 5 stars.').max(5).optional(),
  doctorComment: z.string().trim().max(1000, 'Keep doctor feedback under 1,000 characters.').optional(),
  // Hospital feedback (optional if consultation was not at a hospital)
  hospitalRating: z.number().int().min(1).max(5).nullable().optional(),
  hospitalComment: z.string().trim().max(1000, 'Keep hospital feedback under 1,000 characters.').nullable().optional(),
  hospitalId: z.string().uuid().nullable().optional(),
})

export type AppointmentFeedbackInput = z.input<typeof FeedbackInput>

/**
 * Saves the signed-in patient's feedback for both Doctor and Hospital after an appointment.
 * Shows on doctor profiles, hospital profiles, patient portal, and immediately on the home page.
 */
export async function submitAppointmentFeedback(input: AppointmentFeedbackInput): Promise<Result> {
  const parsed = FeedbackInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your feedback.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please log in to review your visit.' }

  const admin = createAdminClient()
  const { data: visit } = await admin
    .from('appointments')
    .select('id, patient_id, doctor_id, hospital_id, status, doctors ( hospital_id )')
    .eq('id', parsed.data.appointmentId)
    .maybeSingle()

  if (!visit || visit.patient_id !== user.id) return { ok: false, error: 'Visit not found.' }
  if (visit.status !== 'completed' && visit.status !== 'visited') {
    return { ok: false, error: 'You can review a visit once your consultation has taken place.' }
  }

  const doctorObj = Array.isArray(visit.doctors) ? visit.doctors[0] : visit.doctors
  // The hospital comes from the visit, never from the browser, so a review can only be about where the visit was.
  const effectiveHospitalId = visit.hospital_id || doctorObj?.hospital_id || null

  const docRating = parsed.data.doctorRating ?? parsed.data.rating ?? 5
  const docComment = parsed.data.doctorComment ?? parsed.data.comment ?? null
  const hospRating = parsed.data.hospitalRating ?? null
  const hospComment = parsed.data.hospitalComment ?? null

  // 1. Save Doctor Review (with hospital metadata if supported)
  const fullDoctorPayload = {
    appointment_id: visit.id,
    doctor_id: visit.doctor_id,
    patient_id: user.id,
    rating: docRating,
    comment: docComment || null,
    hospital_id: effectiveHospitalId,
    hospital_rating: hospRating,
    hospital_comment: hospComment || null,
    is_published: true,
    updated_at: new Date().toISOString(),
  }

  let { error: docError } = await admin.from('doctor_reviews').upsert(fullDoctorPayload, { onConflict: 'appointment_id' })

  // Fallback if extended hospital columns aren't migrated in DB yet
  if (docError && (/hospital/i.test(docError.message) || /column/i.test(docError.message))) {
    const fallbackPayload = {
      appointment_id: visit.id,
      doctor_id: visit.doctor_id,
      patient_id: user.id,
      rating: docRating,
      comment: docComment || null,
      is_published: true,
      updated_at: new Date().toISOString(),
    }
    const res = await admin.from('doctor_reviews').upsert(fallbackPayload, { onConflict: 'appointment_id' })
    docError = res.error
  }

  if (docError) {
    console.error('submitDoctorReview:', docError)
    return {
      ok: false,
      error: migrationHint(docError) ? 'Reviews aren’t switched on yet. Please try again later.' : 'Could not save your review. Please try again.',
    }
  }

  // 2. Save dedicated Hospital Review if hospital is linked and rating provided
  if (effectiveHospitalId && hospRating) {
    try {
      await admin.from('hospital_reviews').upsert(
        {
          appointment_id: visit.id,
          hospital_id: effectiveHospitalId,
          patient_id: user.id,
          rating: hospRating,
          comment: hospComment || null,
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'appointment_id' },
      )
    } catch (hospErr) {
      console.warn('Optional hospital_reviews write bypassed:', hospErr)
    }
  }

  // Revalidate relevant pages
  const paths = [
    '/',
    '/patient/appointments',
    '/patient/profile',
    `/doctors/${visit.doctor_id}`,
    '/doctor/profile',
    '/prices',
  ]
  if (effectiveHospitalId) {
    paths.push(`/hospitals/${effectiveHospitalId}`)
  }
  for (const path of paths) revalidatePath(path)

  return { ok: true }
}

/** Legacy alias for submitAppointmentFeedback to ensure existing components compile */
export const submitDoctorReview = submitAppointmentFeedback

// --- The patient's own reviews (My reviews) ---------------------------------------------------------------------------

const MyReview = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5 stars.').max(5),
  comment: z.string().trim().max(1000, 'Keep your review under 1,000 characters.').optional(),
  tags: z.array(z.enum(REVIEW_TAGS)).max(REVIEW_TAGS.length).optional(),
})

async function myVisitReview(appointmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: visit } = await admin.from('appointments').select('id, patient_id, doctor_id, hospital_id, status').eq('id', appointmentId).maybeSingle()
  if (!visit || visit.patient_id !== user.id) return null
  return { user, admin, visit }
}

function revalidateReview(doctorId: string, hospitalId: string | null) {
  for (const path of ['/', '/patient/reviews', '/patient/appointments', `/doctors/${doctorId}`, '/doctor/profile']) revalidatePath(path)
  if (hospitalId) revalidatePath(`/hospitals/${hospitalId}`)
}

/** Posts or edits the signed-in patient's review of their own completed visit, with what stood out. */
export async function saveMyReview(input: z.input<typeof MyReview>): Promise<Result> {
  const parsed = MyReview.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your review.' }
  const found = await myVisitReview(parsed.data.appointmentId)
  if (!found) return { ok: false, error: 'Visit not found.' }
  const { user, admin, visit } = found
  if (visit.status !== 'completed' && visit.status !== 'visited') return { ok: false, error: 'You can review a visit once your consultation has taken place.' }

  const row = {
    appointment_id: visit.id,
    doctor_id: visit.doctor_id,
    patient_id: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    is_published: true,
    updated_at: new Date().toISOString(),
  }
  let { error } = await admin.from('doctor_reviews').upsert({ ...row, tags: parsed.data.tags ?? [] }, { onConflict: 'appointment_id' })
  // Before 20261116 there is no tags column: save the review without them.
  if (error && /tags/i.test(error.message ?? '')) ({ error } = await admin.from('doctor_reviews').upsert(row, { onConflict: 'appointment_id' }))
  if (error) {
    console.error('saveMyReview:', error)
    return { ok: false, error: migrationHint(error) ? 'Reviews aren’t switched on yet. Please try again later.' : 'Could not save your review. Please try again.' }
  }
  revalidateReview(visit.doctor_id, visit.hospital_id)
  return { ok: true }
}

/** Deletes the signed-in patient's review of one of their visits (and its hospital rating). */
export async function deleteMyReview(appointmentId: string): Promise<Result> {
  if (!z.string().uuid().safeParse(appointmentId).success) return { ok: false, error: 'Review not found.' }
  const found = await myVisitReview(appointmentId)
  if (!found) return { ok: false, error: 'Review not found.' }
  const { user, admin, visit } = found
  const { error } = await admin.from('doctor_reviews').delete().eq('appointment_id', visit.id).eq('patient_id', user.id)
  if (error) return { ok: false, error: 'Could not delete your review. Please try again.' }
  await admin.from('hospital_reviews').delete().eq('appointment_id', visit.id).eq('patient_id', user.id)
  revalidateReview(visit.doctor_id, visit.hospital_id)
  return { ok: true }
}
