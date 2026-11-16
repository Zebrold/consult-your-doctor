'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'

// Pausing a doctor's new online bookings (migration 20261118 section 4; lib/doctor-pause.ts has the reads). The doctor's
// home hospital can pause and resume any of its doctors; a doctor can pause themselves and resume only a pause they set.

type Result = { ok: true; paused: boolean } | { ok: false; error: string }
const NOT_READY = 'Pausing opens after the next update.'
const uuid = z.string().uuid()

/** The columns arrive with the migration; until then Postgres or PostgREST says the column doesn't exist. */
const missingColumn = (e: { code?: string; message?: string }) =>
  e.code === '42703' || e.code === 'PGRST204' || /bookings_paused/.test(e.message ?? '')

function refresh(doctorId: string, hospitalId: string | null) {
  revalidatePath('/hospital/doctors')
  revalidatePath('/doctor/dashboard')
  revalidatePath(`/doctors/${doctorId}`)
  if (hospitalId) revalidatePath(`/hospitals/${hospitalId}`)
  revalidatePath('/find')
  revalidatePath('/')
}

export async function setHospitalDoctorPaused(doctorId: string, paused: boolean): Promise<Result> {
  const parsed = z.object({ doctorId: uuid, paused: z.boolean() }).safeParse({ doctorId, paused })
  if (!parsed.success) return { ok: false, error: 'Please try again.' }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { ok: false, error: 'Please log in with your hospital account.' }
  const hospitalId = profile.hospital_id as string

  // Only the home hospital's own doctors (visiting doctors are paused by their own hospital).
  const { data: doctor } = await admin.from('doctors').select('id').eq('id', doctorId).eq('hospital_id', hospitalId).maybeSingle()
  if (!doctor) return { ok: false, error: 'Doctor not found.' }

  const { data, error } = await admin
    .from('doctors')
    .update({ bookings_paused: paused, bookings_paused_by: paused ? 'hospital' : null, bookings_paused_at: paused ? new Date().toISOString() : null })
    .eq('id', doctorId)
    .eq('hospital_id', hospitalId)
    .select('id')
  if (error) {
    if (missingColumn(error)) return { ok: false, error: NOT_READY }
    console.error('setHospitalDoctorPaused:', error.message)
    return { ok: false, error: 'Could not save this. Please try again.' }
  }
  if (!data?.length) return { ok: false, error: 'Doctor not found.' }
  refresh(doctorId, hospitalId)
  return { ok: true, paused }
}

export async function setMyBookingsPaused(paused: boolean): Promise<Result> {
  const parsed = z.boolean().safeParse(paused)
  if (!parsed.success) return { ok: false, error: 'Please try again.' }
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in again.' }
  const admin = createAdminClient()
  const { data: doctor } = await admin.from('doctors').select('id, hospital_id').eq('profile_id', user.id).maybeSingle()
  if (!doctor) return { ok: false, error: 'Please log in with your doctor account.' }
  const doctorId = doctor.id as string

  // A pause the hospital set can only be lifted by the hospital.
  const { data: state, error: readError } = await admin.from('doctors').select('bookings_paused, bookings_paused_by').eq('id', doctorId).maybeSingle()
  if (readError) return { ok: false, error: missingColumn(readError) ? NOT_READY : 'Could not save this. Please try again.' }
  if (!paused && state?.bookings_paused && state.bookings_paused_by === 'hospital') {
    return { ok: false, error: 'Your hospital paused your bookings. Ask them to switch them back on.' }
  }

  // The condition keeps a hospital pause from being replaced or lifted by a request that raced the check above.
  const { data, error } = await admin
    .from('doctors')
    .update({ bookings_paused: paused, bookings_paused_by: paused ? 'doctor' : null, bookings_paused_at: paused ? new Date().toISOString() : null })
    .eq('id', doctorId)
    .or('bookings_paused_by.is.null,bookings_paused_by.eq.doctor')
    .select('id')
  if (error) {
    if (missingColumn(error)) return { ok: false, error: NOT_READY }
    console.error('setMyBookingsPaused:', error.message)
    return { ok: false, error: 'Could not save this. Please try again.' }
  }
  if (!data?.length) return { ok: false, error: 'Your hospital paused your bookings. Ask them to switch them back on.' }
  refresh(doctorId, (doctor.hospital_id as string | null) ?? null)
  return { ok: true, paused }
}
