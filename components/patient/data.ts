import type { createClient } from '@/lib/supabase/server'
import { istDateKey } from './format'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type Availability = { nextSlot: string | null; openToday: number }

const LOOKAHEAD_DAYS = 30

/** Each doctor's next open appointment slot (and how many are left today), from the hospitals' published schedules. */
export async function loadAvailability(supabase: Supabase, now: number, doctorIds?: string[]): Promise<Record<string, Availability>> {
  if (doctorIds && doctorIds.length === 0) return {}
  let query = supabase
    .from('schedules')
    .select('doctor_id, start_time')
    .eq('is_booked', false)
    .gt('start_time', new Date(now).toISOString())
    .lt('start_time', new Date(now + LOOKAHEAD_DAYS * 86_400_000).toISOString())
    .order('start_time', { ascending: true })
    .limit(5000)
  if (doctorIds) query = query.in('doctor_id', doctorIds)

  const { data } = await query
  const today = istDateKey(now)
  const result: Record<string, Availability> = {}
  for (const slot of (data ?? []) as { doctor_id: string; start_time: string }[]) {
    const entry = (result[slot.doctor_id] ??= { nextSlot: slot.start_time, openToday: 0 })
    if (istDateKey(slot.start_time) === today) entry.openToday++
  }
  return result
}

export type PatientDefaults = { name: string; phone: string; email: string; dateOfBirth: string; gender: string };

/** The signed-in patient's saved details for pre-filling a booking form, or null for a visitor. */
export async function loadPatientDefaults(supabase: Supabase): Promise<PatientDefaults | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: details }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone_number, email').eq('id', user.id).maybeSingle(),
    supabase.from('patient_details').select('date_of_birth, gender').eq('id', user.id).maybeSingle(),
  ])
  return {
    name: profile?.full_name || user.user_metadata?.full_name || '',
    phone: profile?.phone_number || user.phone || '',
    email: profile?.email || user.email || '',
    dateOfBirth: details?.date_of_birth || '',
    gender: details?.gender || '',
  }
}

/** Supabase returns to-one joins as an object or a one-element array depending on the relationship. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export const currentTime = () => Date.now()
