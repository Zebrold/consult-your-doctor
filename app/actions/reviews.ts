'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrationHint } from '@/lib/desk-payments'

type Result = { ok: true } | { ok: false; error: string }

const Input = z.object({
  appointmentId: z.guid(),
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5 stars.').max(5),
  comment: z.string().trim().max(1000, 'Keep the review under 1,000 characters.'),
})

/**
 * Saves the signed-in patient's review of a finished consultation (one per visit; writing again updates it). It shows
 * on the doctor's profile, in the doctor's portal and on the home page straight away.
 */
export async function submitDoctorReview(input: z.input<typeof Input>): Promise<Result> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your review.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in to review your visit.' }

  const admin = createAdminClient()
  const { data: visit } = await admin.from('appointments').select('id, patient_id, doctor_id, status').eq('id', parsed.data.appointmentId).maybeSingle()
  if (!visit || visit.patient_id !== user.id) return { ok: false, error: 'Visit not found.' }
  if (visit.status !== 'completed' && visit.status !== 'visited') return { ok: false, error: 'You can review a visit once your consultation has taken place.' }

  const { error } = await admin.from('doctor_reviews').upsert(
    {
      appointment_id: visit.id,
      doctor_id: visit.doctor_id,
      patient_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      is_published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'appointment_id' },
  )
  if (error) {
    console.error('submitDoctorReview:', error)
    return { ok: false, error: migrationHint(error) ? 'Reviews aren’t switched on yet. Please try again later.' : 'Could not save your review. Please try again.' }
  }

  for (const path of ['/', '/patient/appointments', '/patient/profile', `/doctors/${visit.doctor_id}`, '/doctor/profile', '/prices']) revalidatePath(path)
  return { ok: true }
}
