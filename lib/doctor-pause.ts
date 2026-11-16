import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Pausing a doctor's bookings (migration 20261118 section 4). A paused doctor is hidden from patient search, lists,
 * hospital pages and the sitemap and gets no new online bookings. Existing bookings, desk bookings and rescheduling
 * are not affected. Before the migration runs the columns don't exist: nobody is paused and `ready` is false.
 */

export type PausedBy = 'doctor' | 'hospital'

type Admin = ReturnType<typeof createAdminClient>

const asBy = (v: unknown): PausedBy | null => (v === 'doctor' || v === 'hospital' ? v : null)

/** Ids of every doctor whose bookings are paused (empty before the migration or on any read error). Once per request. */
export const pausedDoctorIds = cache(async (): Promise<Set<string>> => {
  try {
    const { data, error } = await createAdminClient().from('doctors').select('id').eq('bookings_paused', true).limit(5000)
    if (error) return new Set()
    return new Set(((data ?? []) as { id: string }[]).map((r) => r.id))
  } catch {
    return new Set()
  }
})

/** One doctor's pause state. `ready` is false while the columns don't exist. */
export async function doctorPause(admin: Admin, doctorId: string): Promise<{ ready: boolean; paused: boolean; by: PausedBy | null }> {
  const { data, error } = await admin.from('doctors').select('bookings_paused, bookings_paused_by').eq('id', doctorId).maybeSingle()
  if (error || !data) return { ready: false, paused: false, by: null }
  const row = data as { bookings_paused: boolean | null; bookings_paused_by: string | null }
  return { ready: true, paused: !!row.bookings_paused, by: row.bookings_paused ? asBy(row.bookings_paused_by) : null }
}

/** Pause state of several doctors at once. */
export async function doctorPauses(admin: Admin, ids: string[]): Promise<{ ready: boolean; byId: Map<string, { paused: boolean; by: PausedBy | null }> }> {
  const byId = new Map<string, { paused: boolean; by: PausedBy | null }>()
  if (ids.length === 0) return { ready: true, byId }
  const { data, error } = await admin.from('doctors').select('id, bookings_paused, bookings_paused_by').in('id', ids)
  if (error) return { ready: false, byId }
  for (const r of (data ?? []) as { id: string; bookings_paused: boolean | null; bookings_paused_by: string | null }[]) {
    byId.set(r.id, { paused: !!r.bookings_paused, by: r.bookings_paused ? asBy(r.bookings_paused_by) : null })
  }
  return { ready: true, byId }
}
