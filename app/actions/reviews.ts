'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrationHint } from '@/lib/desk-payments'

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
  if (!user) return { ok: false, error: 'Please sign in to review your visit.' }

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
