'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isClockTime, toMinutes } from '@/lib/walk-in'

// The hospital's walk-in hours (Hospital portal → Walk-in & QR, lib/walk-in.ts).

type Result = { ok: true } | { ok: false; error: string }

const NOT_SET_UP = 'Walk-in booking isn’t switched on yet. Run supabase/migrations/20261122_hospital_walk_in.sql in Supabase, then try again.'

export async function saveWalkInHours(input: { enabled: boolean; start: string; end: string; days: number[] }): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Please log in with your hospital account.' }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, hospital_id').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'hospital_admin' || !profile.hospital_id) return { ok: false, error: 'Only the hospital’s admin login can change walk-in hours.' }
  const hospitalId = profile.hospital_id as string

  const enabled = input?.enabled === true
  const start = String(input?.start ?? '')
  const end = String(input?.end ?? '')
  const days = [...new Set((Array.isArray(input?.days) ? input.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
  if (!isClockTime(start) || !isClockTime(end)) return { ok: false, error: 'Choose the time walk-ins start and end.' }
  if (toMinutes(end) <= toMinutes(start)) return { ok: false, error: 'The end time must be after the start time, on the same day.' }
  if (enabled && !days.length) return { ok: false, error: 'Pick at least one day for walk-ins.' }

  const { error } = await admin
    .from('hospitals')
    .update({ walk_in_enabled: enabled, walk_in_start: start, walk_in_end: end, walk_in_days: days.length ? days : [0, 1, 2, 3, 4, 5, 6] })
    .eq('id', hospitalId)
  if (error) {
    console.error('saveWalkInHours:', error.message)
    return { ok: false, error: /walk_in|schema cache|column/i.test(error.message) ? NOT_SET_UP : 'Could not save the walk-in hours. Please try again.' }
  }
  revalidatePath('/hospital/walk-in')
  revalidatePath(`/hospitals/${hospitalId}`)
  return { ok: true }
}
