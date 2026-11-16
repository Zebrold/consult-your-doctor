'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { overLimit } from '@/lib/rate-limit'
import { RECORD_BUCKET, recordPath } from '@/lib/records'
import { reportPath } from '@/lib/lab-reports'

// A patient controlling who sees their records: share one file through a link that stops working after 7 days, and
// remove a doctor's access to their past visits. Every read and write is filtered by the signed-in patient.

const HOUR = 60 * 60_000
const WEEK_SECONDS = 7 * 86_400
const uuid = z.string().uuid()
const shareInput = z.object({ source: z.enum(['visit', 'lab', 'upload']), id: uuid })

export type ShareResult = { ok: true; url: string; expiresAt: string } | { ok: false; error: string }
export type AccessResult = { ok: true } | { ok: false; error: string }

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

/** A signed link to one file the patient owns, valid for 7 days. The link can't be taken back before it expires. */
export async function shareRecordLink(input: { source: 'visit' | 'lab' | 'upload'; id: string }): Promise<ShareResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const parsed = shareInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'This record can’t be shared.' }
  if (await overLimit(`record-share:${user.id}`, 30, HOUR)) return { ok: false, error: 'Too many links made. Please try again in a little while.' }

  const { source, id } = parsed.data
  const admin = createAdminClient()
  let path: string | null = null

  if (source === 'visit') {
    const { data } = await admin.from('medical_records').select('id, file_url, appointments!inner ( patient_id )').eq('id', id).maybeSingle()
    const owner = one((data as { appointments?: { patient_id: string | null } | { patient_id: string | null }[] | null } | null)?.appointments)
    if (!data || owner?.patient_id !== user.id) return { ok: false, error: 'Record not found.' }
    path = recordPath((data as { file_url: string | null }).file_url)
  } else if (source === 'lab') {
    const { data } = await admin.from('diagnostic_bookings').select('id, center_id, status').eq('id', id).eq('patient_id', user.id).maybeSingle()
    if (!data) return { ok: false, error: 'Record not found.' }
    const row = data as { id: string; center_id: string | null; status: string }
    if (row.status === 'report_sent' && row.center_id) path = reportPath(row.center_id, row.id)
  } else {
    const { data } = await admin.from('patient_records').select('id, file_path').eq('id', id).eq('patient_id', user.id).maybeSingle()
    if (!data) return { ok: false, error: 'Record not found.' }
    path = (data as { file_path: string | null }).file_path || null
  }

  if (!path) return { ok: false, error: 'This record has no file to share.' }
  const { data: signed, error } = await admin.storage.from(RECORD_BUCKET).createSignedUrl(path, WEEK_SECONDS)
  if (error || !signed?.signedUrl) return { ok: false, error: 'This record has no file to share.' }
  return { ok: true, url: signed.signedUrl, expiresAt: new Date(Date.now() + WEEK_SECONDS * 1000).toISOString() }
}

/** Stops a doctor seeing the patient's past visits with them. A visit booked with that doctor later is shared again. */
export async function removeDoctorAccess(doctorId: string): Promise<AccessResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  if (!uuid.safeParse(doctorId).success) return { ok: false, error: 'Not found.' }
  if (await overLimit(`record-remove:${user.id}`, 20, HOUR)) return { ok: false, error: 'Too many changes. Please try again in a little while.' }

  const admin = createAdminClient()
  const { data: booked } = await admin.from('appointments').select('id').eq('patient_id', user.id).eq('doctor_id', doctorId).limit(1)
  if (!booked?.length) return { ok: false, error: 'Not found.' }

  const { error } = await admin
    .from('record_access_blocks')
    .upsert({ patient_id: user.id, doctor_id: doctorId, blocked_at: new Date().toISOString() }, { onConflict: 'patient_id,doctor_id' })
  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code ?? '')) return { ok: false, error: 'Removing access opens after the next update.' }
    console.error('removeDoctorAccess:', error)
    return { ok: false, error: 'Couldn\u2019t remove access. Please try again.' }
  }
  revalidatePath('/patient/records')
  return { ok: true }
}
