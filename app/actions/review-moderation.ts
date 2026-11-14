'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = { ok: true } | { ok: false; error: string }

const Input = z.object({
  kind: z.enum(['doctor', 'hospital']),
  id: z.string().uuid(),
  published: z.boolean(),
})

/**
 * Review moderation (/executive/reviews): hides a patient's review from the public doctor and hospital pages and the
 * home page, or puts a hidden one back. Every public read already filters on is_published, so nothing else changes.
 */
export async function setReviewPublished(kind: 'doctor' | 'hospital', id: string, published: boolean): Promise<Result> {
  const parsed = Input.safeParse({ kind, id, published })
  if (!parsed.success) return { ok: false, error: 'Not found.' }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'executive') return { ok: false, error: 'Only the Consult your Doctor team can moderate reviews.' }

  const table = parsed.data.kind === 'doctor' ? 'doctor_reviews' : 'hospital_reviews'
  const { data: row, error } = await admin
    .from(table)
    .update({ is_published: parsed.data.published })
    .eq('id', parsed.data.id)
    .select(parsed.data.kind === 'doctor' ? 'doctor_id' : 'hospital_id')
    .maybeSingle()
  if (error) {
    console.error('setReviewPublished:', error)
    return { ok: false, error: 'Could not change the review. Please try again.' }
  }
  if (!row) return { ok: false, error: 'That review no longer exists.' }

  const target = row as { doctor_id?: string | null; hospital_id?: string | null }
  revalidatePath('/executive/reviews')
  revalidatePath('/')
  if (target.doctor_id) revalidatePath(`/doctors/${target.doctor_id}`)
  if (target.hospital_id) revalidatePath(`/hospitals/${target.hospital_id}`)
  return { ok: true }
}
